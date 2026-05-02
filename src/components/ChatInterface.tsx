import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import type { KeyboardEvent } from 'react';
import { useGeminiChat, type JourneyResponse, type GeminiPayload, type MissionResponse } from '../hooks/useGeminiChat';
import { MissionCard } from './MissionCard';
import { ModeComparePanel } from './ModeComparePanel';
import type { Mission } from '../hooks/useAppState';
import './ChatInterface.css';

interface DisplayMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  showGlobeHint?: boolean;
}

const INITIAL_MESSAGE: DisplayMessage = {
  id: '1',
  text: '🤖 I\'m your AI Network Copilot. I can control the globe, run simulations, and explain how the internet works. Try the commands below or just ask me anything!',
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
  onAction?: (action: 'SET_MODE' | 'FOCUS_CITY', payload: string) => void;
  onMissionStart?: (mission: Mission) => void;
  onMissionComplete?: () => void;
  onMissionReset?: () => void;
  onToggleCompare?: () => void;
}

export interface ChatInterfaceRef {
  reset: () => void;
}

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(
  ({ selectedCity, selectedArc, simulationMode, osiStep, activeMission, compareMode, onJourney, onScenario, onAction, onMissionStart, onMissionComplete, onMissionReset, onToggleCompare }, ref) => {
    const [inputValue, setInputValue] = useState('');
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const handledPayloadRef = useRef<GeminiPayload | null>(null);
    const { messages, loading, error, lastPayload, send, clear, retry, chips } = useGeminiChat({
      selectedCity,
      selectedArc,
      simulationMode,
      osiStep,
    });

    const displayMessages = useMemo<DisplayMessage[]>(() => {
      const parsed = messages.map((message, index): DisplayMessage => {
        const text = message.parts[0]?.text ?? '';
        const sender = message.role === 'user' ? 'user' : 'ai';
        const parsedResponse = sender === 'ai' ? parseModelResponse(text) : null;
        return {
          id: `${index + 2}`,
          text: parsedResponse?.text ?? text,
          sender,
          showGlobeHint: parsedResponse?.showGlobeHint ?? false,
        };
      });
      return [INITIAL_MESSAGE, ...parsed];
    }, [messages]);

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
        onScenario(lastPayload.mode);
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
    }, [lastPayload, onJourney, onScenario, onAction]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        clear();
        setInputValue('');
        handledPayloadRef.current = null;
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
      onAction?.('FOCUS_CITY', cityId);
      setInputValue('');
      await send(prompt);
    };

    // Direct simulation chips — trigger mode change + zoom out instantly,
    // then also send the message so the AI explains it
    const handleSimChip = async (mode: string, prompt: string) => {
      if (sessionCapped || loading) return;
      // Trigger mode change immediately for instant visual feedback
      onAction?.('SET_MODE', mode);
      // Send the prompt so AI explains what's happening
      setInputValue('');
      await send(prompt);
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
    };

    // Determine active sim mode for chip highlighting
    const activeMode = simulationMode || 'normal';
    const activeModeGuide: Record<string, { title: string; observe: string; cause: string; impact: string }> = {
      normal: {
        title: '🌐 Normal',
        observe: 'Traffic flows smoothly with stable route brightness and no major rerouting.',
        cause: 'Demand is steady, routes are healthy, and there are no major outages.',
        impact: 'Apps feel fast and consistent for most users.',
      },
      'high-load': {
        title: '🚦 Rush Hour',
        observe: 'More routes look busy and some paths start to queue.',
        cause: 'Peak evening traffic, viral live events, game updates, or major app releases.',
        impact: 'Video may buffer more and response time can feel slower.',
      },
      'packet-loss': {
        title: '📶 Packet Loss',
        observe: 'Traffic appears unstable because some small data pieces must be sent again.',
        cause: 'Weak wireless signal, overloaded links, interference, or damaged/noisy connections.',
        impact: 'Calls can stutter, games lag, and pages may feel jumpy to load.',
      },
      'cable-cut': {
        title: '✂️ Cable Break',
        observe: 'A route drops and traffic reroutes through longer backup paths.',
        cause: 'Ship anchors, undersea earthquakes, fishing activity, or construction accidents.',
        impact: 'Some regions see slower speeds until alternate routes fully absorb the traffic.',
      },
    };
    const modeGuide = activeModeGuide[activeMode] ?? activeModeGuide.normal;
    const modeGuideTone: Record<string, string> = {
      normal: 'normal',
      'high-load': 'warn',
      'packet-loss': 'loss',
      'cable-cut': 'danger',
    };
    const guideTone = modeGuideTone[activeMode] ?? 'normal';

  return (
    <div className="chat-interface">
      {/* Simulation Control Bar */}
      <div className="sim-control-bar">
        <div className="sim-bar-label">⚡ Simulation Controls</div>
        <div className="sim-chips">
          <button
            className={`sim-chip ${activeMode === 'normal' ? 'sim-active' : ''}`}
            disabled={loading}
            onClick={() => void handleSimChip('normal', 'Set the network to normal mode. Explain in 3 short lines with these labels: "What you see:", "Why it happens:", "User impact:". Keep it plain English.')}
          >
            🌐 Normal
          </button>
          <button
            className={`sim-chip sim-warn ${activeMode === 'high-load' ? 'sim-active' : ''}`}
            disabled={loading}
            onClick={() => void handleSimChip('high-load', 'Simulate rush hour / high load. Explain in 3 short lines with labels "What you see:", "Why it happens:", "User impact:". Include clear real-world causes in plain English.')}
          >
            🚦 Rush Hour
          </button>
          <button
            className={`sim-chip sim-warn ${activeMode === 'packet-loss' ? 'sim-active' : ''}`}
            disabled={loading}
            onClick={() => void handleSimChip('packet-loss', 'Simulate packet loss. Explain in 3 short lines with labels "What you see:", "Why it happens:", "User impact:". Explain packet as small pieces of data and include clear causes.')}
          >
            📶 Packet Loss
          </button>
          <button
            className={`sim-chip sim-danger ${activeMode === 'cable-cut' ? 'sim-active' : ''}`}
            disabled={loading}
            onClick={() => void handleSimChip('cable-cut', 'Simulate a cable break. Explain in 3 short lines with labels "What you see:", "Why it happens:", "User impact:". Include clear causes like anchors or earthquakes in plain English.')}
          >
            ✂️ Cable Break
          </button>
        </div>
        <div className={`sim-mode-guide sim-mode-guide--${guideTone}`}>
          <span className="sim-mode-guide-title">{modeGuide.title}</span>
          <span className="sim-mode-guide-detail"><strong>What you see:</strong> {modeGuide.observe}</span>
          <span className="sim-mode-guide-detail"><strong>Why it happens:</strong> {modeGuide.cause}</span>
          <span className="sim-mode-guide-detail"><strong>User impact:</strong> {modeGuide.impact}</span>
        </div>

        {/* Compare Mode Toggle */}
        <button
          className={`compare-toggle ${compareMode ? 'compare-active' : ''}`}
          disabled={loading || activeMode === 'normal'}
          onClick={() => onToggleCompare?.()}
          title="Toggle before/after comparison view"
        >
          📊 Compare: Normal vs {activeMode === 'normal' ? 'Current' : activeMode.replace('-', ' ')}
        </button>
      </div>

      {/* Compare Panel */}
      <ModeComparePanel
        mode={(activeMode as any) || 'normal'}
        isVisible={compareMode && activeMode !== 'normal'}
      />

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
                <div className="globe-watch-card">✨ Watch the globe →</div>
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
        <div className="chat-suggestions-label">🌍 Focus a city:</div>
        <button className="suggestion-chip city-chip" disabled={inputDisabled} onClick={() => void handleCityFocusChip('sgp', "Show me Singapore and tell me why it's important")}>
          🇸🇬 Singapore
        </button>
        <button className="suggestion-chip city-chip" disabled={inputDisabled} onClick={() => void handleCityFocusChip('tok', "Focus on Tokyo and explain its role in the internet")}>
          🇯🇵 Tokyo
        </button>
        <button className="suggestion-chip city-chip" disabled={inputDisabled} onClick={() => void handleCityFocusChip('nyc', "Show me New York and explain its transatlantic connections")}>
          🇺🇸 New York
        </button>
        <button className="suggestion-chip city-chip" disabled={inputDisabled} onClick={() => void handleCityFocusChip('fra', "Focus on Frankfurt and tell me about DE-CIX")}>
          🇩🇪 Frankfurt
        </button>
        <div className="chat-suggestions-label" style={{ marginTop: '4px' }}>💬 Ask me:</div>
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
            Start a new session →
          </button>
        </div>
      )}
      <div className="chat-input-bar">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask anything or command the globe..."
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

  const ensureSimulationBreakdown = (mode: string, raw: string): string => {
    const causeFallback: Record<string, string> = {
      'high-load':
        'Why it happens: Demand spikes from live events and peak-hour usage can overload major routes.',
      'packet-loss':
        'Why it happens: Weak signal and noisy or congested links can drop small pieces of data, so they are re-sent.',
      'cable-cut':
        'Why it happens: Ship anchors and undersea earthquakes can physically damage a cable route.',
      normal:
        'Why it happens: Demand stays steady and routes remain healthy, so traffic stays balanced.',
    };
    const impactFallback: Record<string, string> = {
      'high-load':
        'User impact: Streaming buffers more often and apps may respond slower.',
      'packet-loss':
        'User impact: Calls may stutter, games can lag, and loading may feel unstable.',
      'cable-cut':
        'User impact: Traffic reroutes to longer paths, which can raise latency in affected regions.',
      normal:
        'User impact: Most apps feel stable and responsive.',
    };

    const content = raw.trim();
    const hasWhat = /what you see:/i.test(content);
    const hasWhy = /why it happens:|cause/i.test(content);
    const hasImpact = /user impact:|impact/i.test(content);

    const whatLine = hasWhat ? content : `What you see: ${content}`;
    const whyLine = hasWhy ? '' : causeFallback[mode] ?? '';
    const impactLine = hasImpact ? '' : impactFallback[mode] ?? '';

    return [whatLine, whyLine, impactLine].filter(Boolean).join('\n');
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
      return {
        text: ensureSimulationBreakdown(
          typeof parsed.mode === 'string' ? parsed.mode : '',
          parsed.story,
        ),
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
          text: ensureSimulationBreakdown(parsed.payload, parsed.message),
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
