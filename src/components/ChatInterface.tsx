import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import type { KeyboardEvent } from 'react';
import { useGeminiChat, type JourneyResponse, type GeminiPayload, type MissionResponse, type DecisionResponse, type ScenarioResponse } from '../hooks/useGeminiChat';
import { CITIES, CONNECTIONS } from '../data/network';
import { MissionCard } from './MissionCard';
import type { Mission } from '../hooks/useAppState';
import type { DecisionVisualImpact } from '../utils/simulationDecisionEngine';
import './ChatInterface.css';

interface DisplayMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  showGlobeHint?: boolean;
}

const INITIAL_MESSAGE: DisplayMessage = {
  id: '1',
  text: 'I\'m your AI network guide. I can control the globe, run simulations, and explain how the internet works. Use the controls on the globe or ask me anything.',
  sender: 'ai',
};

interface ChatInterfaceProps {
  selectedCity: number | null;
  selectedArc: number | null;
  simulationMode: string | null;
  osiStep: number | null;
  activeMission: Mission | null;
  compareMode: boolean;
  onJourney: (payload: JourneyResponse) => void;
  onScenario: (mode: string) => void;
  onAction?: (action: 'SET_MODE' | 'FOCUS_CITY' | 'SET_MODE_WITH_ARC', payload: string) => void;
  onMissionStart?: (mission: Mission) => void;
  onMissionComplete?: () => void;
  onMissionReset?: () => void;
  onToggleCompare?: () => void;
  onDecision?: (decisionPayload: DecisionResponse) => void;
  onDecisionApplied?: (impact: DecisionVisualImpact) => void;
  onScenarioPayload?: (payload: ScenarioResponse) => void;
}

export interface ChatInterfaceRef {
  reset: () => void;
  applySimulationMode: (mode: string) => void;
}

const SIMULATION_PROMPTS: Record<string, string> = {
  normal:
    'Set the network to normal mode. Explain with exactly 2 short lines: "What you see on map:" and "Why it happens:".',
  'high-load':
    'Simulate route traffic jam / high load on one city-to-city path. Return type "scenario" JSON with mode, connector, fromId, toId, and story. Connector format: {"fromId":"cityId","toId":"cityId","createIfMissing":true}. Pick 2 random different cities for this simulation. Story must use exactly 2 lines with these labels: "What you see on map:", "Why it happens:". In "Why it happens", use route-specific causes only: one link is saturated, office-hour cloud traffic, CDN cache miss, peering bottleneck, maintenance reducing capacity, or a regional ISP overload. Do not mention worldwide game launches, global live streams, viral social surges, or OS updates.',
  'packet-loss':
    'Simulate packet loss. Return type "scenario" JSON with mode, connector, fromId, toId, and story. Connector format: {"fromId":"cityId","toId":"cityId","createIfMissing":true}. Pick 2 random different cities for this simulation. Story must be exactly 2 short lines: "What you see on map:", "Why it happens:". Explain packet as small pieces of data. In "Why it happens", mention 2 realistic causes.',
  'cable-cut':
    'Simulate a cable break. Return type "scenario" JSON with mode, connector, fromId, toId, and story. Connector format: {"fromId":"cityId","toId":"cityId","createIfMissing":true}. Pick 2 random different cities for this simulation. Story must be exactly 2 short lines: "What you see on map:", "Why it happens:". Include clear causes like anchors or earthquakes.',
};

type ScenarioConnector = {
  fromId: string;
  toId: string;
  createIfMissing: boolean;
};

type PendingScenario = {
  mode: string;
  connector: ScenarioConnector;
};

const pickRandomScenarioConnector = (): ScenarioConnector | null => {
  if (CITIES.length < 2) return null;
  const firstIndex = Math.floor(Math.random() * CITIES.length);
  let secondIndex = Math.floor(Math.random() * (CITIES.length - 1));
  if (secondIndex >= firstIndex) secondIndex += 1;

  return {
    fromId: CITIES[firstIndex].id,
    toId: CITIES[secondIndex].id,
    createIfMissing: true,
  };
};

const toScenarioConnector = (payload: ScenarioResponse): ScenarioConnector | null => {
  const connector = payload.connector;
  const fromId = connector?.fromId ?? payload.fromId;
  const toId = connector?.toId ?? payload.toId;
  if (!fromId || !toId || fromId === toId) return null;
  return {
    fromId,
    toId,
    createIfMissing: connector?.createIfMissing !== false,
  };
};

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(
  ({ selectedCity, selectedArc, simulationMode, osiStep, activeMission, compareMode, onJourney, onScenario, onAction, onMissionStart, onMissionComplete, onMissionReset, onToggleCompare, onDecision, onDecisionApplied, onScenarioPayload }, ref) => {
    const [inputValue, setInputValue] = useState('');
    const [localMessages, setLocalMessages] = useState<DisplayMessage[]>([]);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const handledPayloadRef = useRef<GeminiPayload | null>(null);
    const pendingScenarioRef = useRef<PendingScenario | null>(null);
    const { messages, loading, error, lastPayload, send, clear, retry, chips } = useGeminiChat({
      selectedCity,
      selectedArc,
      simulationMode,
      osiStep,
    });

    const displayMessages = useMemo<DisplayMessage[]>(() => {
      const parsed = messages.map((message, index): DisplayMessage => {
        let text = message.parts[0]?.text ?? '';
        const sender = message.role === 'user' ? 'user' : 'ai';
        const parsedResponse = sender === 'ai' ? parseModelResponse(text) : null;
        // INTERCEPT USER MESSAGES TO SIMPLIFY CHIPS
        if (sender === 'user') {
          if (/Respond with JSON type "action"/i.test(text)) {
            text = text.split('\n')[0] ?? text;
          }
          if (text.includes('Simulate rush hour') || text.includes('Simulate route traffic jam')) {
            text = 'Simulate route traffic jam';
          }
          else if (text.includes('Simulate packet loss')) text = 'Simulate packet loss';
          else if (text.includes('Simulate a cable break')) text = 'Simulate a cable break';
        }

        return {
          id: `${index + 2}`,
          text: parsedResponse?.text ?? text,
          sender,
          showGlobeHint: parsedResponse?.showGlobeHint ?? false,
        };
      });
      return [INITIAL_MESSAGE, ...parsed, ...localMessages];
    }, [messages, localMessages]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
      const container = messagesContainerRef.current;
      if (!container) return;
      container.scrollTo({ top: container.scrollHeight, behavior });
    };

    useEffect(() => {
      const rafId = requestAnimationFrame(() => {
        scrollToBottom('smooth');
      });
      return () => cancelAnimationFrame(rafId);
    }, [displayMessages, loading, error, selectedCity, selectedArc]);

    useEffect(() => {
      const container = messagesContainerRef.current;
      if (!container || typeof ResizeObserver === 'undefined') return;

      const observer = new ResizeObserver(() => {
        container.scrollTop = container.scrollHeight;
      });
      observer.observe(container);

      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (!lastPayload) return;
      if (handledPayloadRef.current === lastPayload) return;
      handledPayloadRef.current = lastPayload;

      if (lastPayload.type === 'journey') {
        onJourney(lastPayload);
      } else if (lastPayload.type === 'scenario') {
        if (onAction) {
          const pending = pendingScenarioRef.current;
          const connector =
            (pending ? pending.connector : null) ??
            toScenarioConnector(lastPayload) ??
            pickRandomScenarioConnector();
          pendingScenarioRef.current = null;
          const scenarioPayload = connector
            ? {
                ...lastPayload,
                connector,
                fromId: connector.fromId,
                toId: connector.toId,
                flowFromId: connector.fromId,
                flowToId: connector.toId,
              }
            : lastPayload;
          console.log('[Scenario] payload', scenarioPayload);
          console.log('[Scenario] pending connector', pending);
          console.log('[Scenario] resolved connector', connector);
          onAction(
            'SET_MODE_WITH_ARC',
            JSON.stringify({
              mode: lastPayload.mode,
              ...(connector
                ? {
                    connector,
                    fromId: connector.fromId,
                    toId: connector.toId,
                    flowFromId: connector.fromId,
                    flowToId: connector.toId,
                  }
                : {}),
            }),
          );
          onScenarioPayload?.(scenarioPayload);
        } else {
          onScenario(lastPayload.mode);
          onScenarioPayload?.(lastPayload);
        }
      } else if (lastPayload.type === 'action') {
        onAction?.(lastPayload.action, lastPayload.payload);
      } else if (lastPayload.type === 'mission') {
        const mission: Mission = {
          id: lastPayload.id,
          title: lastPayload.title,
          goal: lastPayload.goal,
          fromId: lastPayload.fromId,
          toId: lastPayload.toId,
          status: 'inactive',
        };
        // Mission card will be rendered, user can click Start
      }
    }, [lastPayload, onJourney, onScenario, onAction, onScenarioPayload]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        clear();
        setInputValue('');
        setLocalMessages([]);
        handledPayloadRef.current = null;
      },
      applySimulationMode: (mode: string) => {
        void handleSimChip(mode);
      },
    }));

    const handleSend = async (messageText?: string) => {
      const textToSend = messageText ?? inputValue;
      if (!textToSend.trim() || sessionCapped) return;

      setInputValue('');
      await send(textToSend);
    };

    const handleChipClick = async (question: string) => {
      if (sessionCapped) return;
      setInputValue('');
      await send(question);
    };

    const handleCityFocusChip = async (cityId: string, prompt: string) => {
      if (sessionCapped || loading) return;
      setInputValue('');
      await send(
        `${prompt}\nRespond with JSON type "action" using action "FOCUS_CITY", payload "${cityId}", and a short beginner-friendly message.`,
      );
    };

    const handleSimChip = async (mode: string) => {
      if (sessionCapped || loading) return;
      const basePrompt = SIMULATION_PROMPTS[mode] || '';
      if (!basePrompt) return;
      setLocalMessages([]);

      const connector = pickRandomScenarioConnector();
      if (connector) {
        pendingScenarioRef.current = { mode, connector };
      } else {
        pendingScenarioRef.current = null;
      }

      const connectorInstruction = connector
        ? `Use this exact connector and city IDs (do not change them): {"fromId":"${connector.fromId}","toId":"${connector.toId}","createIfMissing":true}. Also set flowFromId and flowToId to the same values so dots move from fromId to toId.`
        : '';
      const prompt = [basePrompt, connectorInstruction].filter(Boolean).join('\n');
      setInputValue('');
      await send(prompt);
    };

    const handleGlobalRushHour = () => {
      if (sessionCapped || loading) return;
      pendingScenarioRef.current = null;
      setInputValue('');
      onScenario('high-load');
      setLocalMessages([
        {
          id: `local-global-rush-${Date.now()}`,
          sender: 'ai',
          text: 'Global traffic spike is running: worldwide demand surge from events like a game release, live sports stream, OS update, or streaming premiere.',
          showGlobeHint: true,
        },
      ]);
    };

    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    };

    const sessionCapped = messages.length >= 25;
    const canSend = inputValue.trim().length > 0 && !loading && !sessionCapped;
    const inputDisabled = loading || sessionCapped;
    const startNewSession = () => {
      clear();
      setInputValue('');
      setLocalMessages([]);
    };

  return (
    <div className="chat-interface">
      {/* Mission Card */}
      {activeMission && lastPayload?.type === 'mission' && (
        <div className="mission-container">
          <MissionCard
            mission={activeMission}
            onStart={() => {
              const missionToStart: Mission = {
                ...activeMission,
                status: 'active',
              };
              onMissionStart?.(missionToStart);
              // Focus on the source city
              onAction?.('FOCUS_CITY', activeMission.fromId);
            }}
            onComplete={() => onMissionComplete?.()}
            onReset={() => onMissionReset?.()}
          />
        </div>
      )}

      {/* Chat Messages */}
      <div className="chat-messages" ref={messagesContainerRef}>
        {displayMessages.map(message => (
          <div
            key={message.id}
            className={`chat-message ${message.sender === 'user' ? 'user' : 'ai'}`}
          >
            {message.sender === 'ai' && <div className="ai-dot" />}
            <div className="message-content-wrap">
              <div className="message-content">{message.text}</div>
              {message.showGlobeHint && (
                <div className="globe-watch-card">Watch the globe for route changes.</div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message ai">
            <div className="ai-dot" />
            <div className="typing-indicator">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        {error && (
          <div className="chat-error">
            <span className="error-text">{error}</span>
            <button className="error-retry" onClick={() => void retry()}>
              retry
            </button>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="chat-suggestions">
        <div className="chat-suggestions-label">Focus a city</div>
        <button className="suggestion-chip city-chip" disabled={inputDisabled} onClick={() => void handleCityFocusChip('sgp', "Show me Singapore and tell me why it's important")}>
          <img className="city-chip-flag" src="https://flagcdn.com/20x15/sg.png" width={20} height={15} alt="SG" />
          <span className="city-chip-cc">SG</span> Singapore
        </button>
        <button className="suggestion-chip city-chip" disabled={inputDisabled} onClick={() => void handleCityFocusChip('tok', "Focus on Tokyo and explain its role in the internet")}>
          <img className="city-chip-flag" src="https://flagcdn.com/20x15/jp.png" width={20} height={15} alt="JP" />
          <span className="city-chip-cc">JP</span> Tokyo
        </button>
        <button className="suggestion-chip city-chip" disabled={inputDisabled} onClick={() => void handleCityFocusChip('nyc', "Show me New York and explain its transatlantic connections")}>
          <img className="city-chip-flag" src="https://flagcdn.com/20x15/us.png" width={20} height={15} alt="US" />
          <span className="city-chip-cc">US</span> New York
        </button>
        <button className="suggestion-chip city-chip" disabled={inputDisabled} onClick={() => void handleCityFocusChip('fra', "Focus on Frankfurt and tell me about DE-CIX")}>
          <img className="city-chip-flag" src="https://flagcdn.com/20x15/de.png" width={20} height={15} alt="DE" />
          <span className="city-chip-cc">DE</span> Frankfurt
        </button>
        <div className="chat-suggestions-label chat-suggestions-label--secondary">Simulate Events</div>
        <button className="suggestion-chip action-chip" disabled={inputDisabled} onClick={handleGlobalRushHour}>
          Global Traffic Spike
        </button>
        <button className="suggestion-chip action-chip" disabled={inputDisabled} onClick={() => void handleSimChip('high-load')}>
          Route Traffic Jam
        </button>
        <button className="suggestion-chip action-chip" disabled={inputDisabled} onClick={() => void handleSimChip('packet-loss')}>
          Packet Loss
        </button>
        <button className="suggestion-chip action-chip" disabled={inputDisabled} onClick={() => void handleSimChip('cable-cut')}>
          Cable Break
        </button>
        <div className="chat-suggestions-label chat-suggestions-label--secondary">Ask me</div>
        {chips.slice(0, 2).map((question, index) => (
          <button
            key={`${question}-${index}`}
            className="suggestion-chip"
            disabled={inputDisabled}
            onClick={() => void handleChipClick(question)}
          >
            {question}
          </button>
        ))}
      </div>

      {sessionCapped && (
        <div className="chat-session-cap">
          <button className="session-reset-btn" onClick={startNewSession}>
            Start a new session
          </button>
        </div>
      )}
      <div className="chat-input-bar">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask a question about the internet map..."
          value={inputValue}
          disabled={inputDisabled}
          onChange={e => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button
          className="chat-send-btn"
          disabled={!canSend}
          onClick={() => void handleSend()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8L14 2L8 14L7 9L2 8Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';

function parseModelResponse(text: string): { text: string; showGlobeHint: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { text: '', showGlobeHint: false };

  const cityNameById = (cityId: string | undefined): string | null => {
    if (!cityId) return null;
    const city = CITIES.find((item) => item.id === cityId);
    return city?.name ?? null;
  };

  const findRoute = (fromId: string | undefined, toId: string | undefined) => {
    if (!fromId || !toId) return null;
    return (
      CONNECTIONS.find(
        (conn) =>
          (conn.from === fromId && conn.to === toId) ||
          (conn.from === toId && conn.to === fromId),
      ) ?? null
    );
  };

  const readScenarioConnector = (
    parsed: Record<string, unknown>,
  ): { fromId?: string; toId?: string } => {
    if (typeof parsed.connector === 'object' && parsed.connector !== null) {
      const connector = parsed.connector as Record<string, unknown>;
      if (typeof connector.fromId === 'string' && typeof connector.toId === 'string') {
        return { fromId: connector.fromId, toId: connector.toId };
      }
    }

    return {
      fromId: typeof parsed.fromId === 'string' ? parsed.fromId : undefined,
      toId: typeof parsed.toId === 'string' ? parsed.toId : undefined,
    };
  };

  const normalizeWhyForCableCut = (raw: string, routeType?: string): string => {
    const lower = raw.toLowerCase();
    if (/gempa|earthquake|bencana|tsunami|hurricane|storm|seismic|landslide/i.test(lower)) {
      return 'A disaster event damaged the physical cable segment on this route.';
    }
    if (/laut|samudra|undersea|subsea|ocean|anchor|kapal|ship/i.test(lower) || routeType === 'Subsea cable') {
      return 'The subsea cable on this route was damaged by ship anchor activity or seabed movement.';
    }
    return 'A physical cable failure on this route stopped traffic flow.';
  };

  const ROUTE_TRAFFIC_JAM_EXAMPLES = [
    'office-hour cloud traffic fills this corridor between two business hubs',
    'a CDN cache miss forces more users on this path to fetch content from a farther data center',
    'a peering bottleneck between providers makes this route queue packets',
    'maintenance reduces available capacity, so traffic squeezes through fewer links',
    'a regional ISP overload pushes extra traffic onto this backbone path',
    'a nearby cloud region is under heavy load, so this route carries spillover traffic',
  ];

  const buildVisualSummary = (
    mode: string,
    raw: string,
    fromId?: string,
    toId?: string,
  ): string => {
    const route = findRoute(fromId, toId);
    const fromName = cityNameById(fromId) ?? route?.from.toUpperCase() ?? null;
    const toName = cityNameById(toId) ?? route?.to.toUpperCase() ?? null;
    const routeLabel = fromName && toName ? `${fromName} → ${toName}` : 'the selected route';

    if (mode === 'high-load') {
      const what = `What you see: Dense packet dots move along ${routeLabel}, and both end nodes pulse continuously.`;

      // Pick 2 route-specific examples to show variety without making it feel global.
      const shuffled = [...ROUTE_TRAFFIC_JAM_EXAMPLES].sort(() => Math.random() - 0.5);
      const example1 = shuffled[0];
      const example2 = shuffled[1];

      const baseReason =
        route && route.congestionScore >= 70
          ? 'This corridor is already one of the busiest routes on the map'
          : 'Traffic demand on this route suddenly spiked';

      const why = `Why it happens: ${baseReason}. Route-level causes include ${example1}, or ${example2}. The path behaves like one crowded highway lane: packets still move, but they queue and slow down.`;
      return `${what}\n${why}`;
    }

    if (mode === 'packet-loss') {
      const what = `What you see: Dots move on ${routeLabel}, then stop at the retry point (↺) before sending again.`;
      const why =
        route?.riskType === 'wireless'
          ? 'Why it happens: Signal instability on this wireless segment drops small pieces of data (called packets), forcing the network to resend them — like leaving a bad voicemail and calling back.'
          : route?.riskType === 'congestion'
            ? 'Why it happens: This route is too crowded — queue overflow causes packets to be dropped, so the sender retransmits them, similar to resending a text message that failed to deliver.'
            : 'Why it happens: Link noise or congestion causes packets (small pieces of data) to go missing, so the network automatically retries, like re-sending a lost email attachment.';
      return `${what}\n${why}`;
    }

    if (mode === 'cable-cut') {
      const what = `What you see: Traffic on ${routeLabel} is cut off and marked with a large X icon.`;
      const why = `Why it happens: ${normalizeWhyForCableCut(raw, route?.type)}`;
      return `${what}\n${why}`;
    }

    return 'What you see: Routes are flowing normally with steady packet movement.\nWhy it happens: No major disruption is currently simulated.';
  };

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed.type === 'journey' && typeof parsed.story === 'string') {
      return { text: parsed.story, showGlobeHint: true };
    }
    if (parsed.type === 'explain') {
      const content = typeof parsed.content === 'string' ? parsed.content : '';
      const analogy = typeof parsed.analogy === 'string' ? parsed.analogy : '';
      return { text: analogy ? `${content}\n\n${analogy}` : content, showGlobeHint: false };
    }
    if (parsed.type === 'scenario' && typeof parsed.story === 'string') {
      const mode = typeof parsed.mode === 'string' ? parsed.mode : '';
      const { fromId, toId } = readScenarioConnector(parsed);
      return {
        text: buildVisualSummary(mode, parsed.story, fromId, toId),
        showGlobeHint: true,
      };
    }
    if (parsed.type === 'fact' && typeof parsed.content === 'string') {
      const emoji = typeof parsed.emoji === 'string' ? parsed.emoji : '';
      return { text: `${emoji} ${parsed.content}`.trim(), showGlobeHint: false };
    }
    if (parsed.type === 'action' && typeof parsed.message === 'string') {
      if (
        parsed.action === 'SET_MODE' &&
        typeof parsed.payload === 'string'
      ) {
        return {
          text: buildVisualSummary(parsed.payload, parsed.message),
          showGlobeHint: true,
        };
      }
      return { text: parsed.message, showGlobeHint: true };
    }
  } catch {
    return { text, showGlobeHint: false };
  }

  return { text, showGlobeHint: false };
}
