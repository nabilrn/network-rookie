import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import type { KeyboardEvent } from 'react';
import { useGeminiChat, type JourneyResponse, type GeminiPayload, type MissionResponse, type DecisionResponse } from '../hooks/useGeminiChat';
import { MissionCard } from './MissionCard';
import { DecisionCard } from './DecisionCard';
import { ModeComparePanel } from './ModeComparePanel';
import type { Mission } from '../hooks/useAppState';
import { getDecisionForMode, calculateConsequence, type DecisionVisualImpact } from '../utils/simulationDecisionEngine';
import { getDecisionMarker, getDecisionMarkerMeaning, getGlobeLegendItems } from '../utils/globeLegend';
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
  onDecision?: (decisionPayload: DecisionResponse) => void;
  onDecisionApplied?: (impact: DecisionVisualImpact) => void;
}

export interface ChatInterfaceRef {
  reset: () => void;
}

type SimMode = 'high-load' | 'packet-loss' | 'cable-cut';

function toDecisionResponse(mode: SimMode): DecisionResponse {
  const localDecision = getDecisionForMode(mode);
  return {
    type: 'decision',
    mode: localDecision.mode,
    question: localDecision.question,
    options: localDecision.options.map(option => ({
      id: option.id,
      label: option.label,
      description: option.description,
    })),
    recommended: localDecision.recommended,
    why: localDecision.why,
  };
}

function buildPriorityFollowupPrompt(
  mode: SimMode,
  selectedOptionId: string,
  selectedLabel: string,
  summary: string,
  tradeoff: string,
  userExperience: string,
): string {
  const markerCode = getDecisionMarker(mode, selectedOptionId);
  const markerMeaning = getDecisionMarkerMeaning(mode, selectedOptionId);
  return [
    `I chose this priority: ${selectedLabel}.`,
    `Current mode: ${mode}.`,
    `Observed result: ${summary}`,
    `Tradeoff: ${tradeoff}`,
    `User experience: ${userExperience}`,
    `Globe legend marker now on routes: "${markerCode}" which means: ${markerMeaning}`,
    'City markers: "+" means improving and "!" means under stress.',
    'Now explain this choice for a complete beginner in plain English.',
    'Include one short line that starts with "Globe legend:".',
    'Respond as type "explain" with max 80 words and one simple analogy sentence.',
    'Do not ask another question.',
  ].join('\n');
}

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(
  ({ selectedCity, selectedArc, simulationMode, osiStep, activeMission, compareMode, onJourney, onScenario, onAction, onMissionStart, onMissionComplete, onMissionReset, onToggleCompare, onDecision, onDecisionApplied }, ref) => {
    const [inputValue, setInputValue] = useState('');
    const [activeDecision, setActiveDecision] = useState<DecisionResponse | null>(null);
    const [pendingDecisionMode, setPendingDecisionMode] = useState<SimMode | null>(null);
    const [decisionAppliedMode, setDecisionAppliedMode] = useState<SimMode | null>(null);
    const [selectedDecisionMarker, setSelectedDecisionMarker] = useState<{ code: string; meaning: string } | null>(null);
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
        setPendingDecisionMode(lastPayload.mode);
        setDecisionAppliedMode(null);
        setActiveDecision(toDecisionResponse(lastPayload.mode));
        setSelectedDecisionMarker(null);
      } else if (lastPayload.type === 'action') {
        onAction?.(lastPayload.action, lastPayload.payload);
        if (
          lastPayload.action === 'SET_MODE' &&
          (lastPayload.payload === 'high-load' ||
            lastPayload.payload === 'packet-loss' ||
            lastPayload.payload === 'cable-cut')
        ) {
          setPendingDecisionMode(lastPayload.payload);
          setDecisionAppliedMode(null);
          setActiveDecision(toDecisionResponse(lastPayload.payload));
          setSelectedDecisionMarker(null);
        } else if (lastPayload.action === 'SET_MODE' && lastPayload.payload === 'normal') {
          setPendingDecisionMode(null);
          setDecisionAppliedMode(null);
          setActiveDecision(null);
          setSelectedDecisionMarker(null);
        }
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
      } else if (lastPayload.type === 'decision') {
        setActiveDecision(lastPayload);
        setPendingDecisionMode(lastPayload.mode);
        setDecisionAppliedMode(null);
        setSelectedDecisionMarker(null);
        onDecision?.(lastPayload);
      }
    }, [lastPayload, onJourney, onScenario, onAction, onDecision]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        clear();
        setInputValue('');
        setActiveDecision(null);
        setPendingDecisionMode(null);
        setDecisionAppliedMode(null);
        setSelectedDecisionMarker(null);
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
      if (mode === 'normal') {
        setActiveDecision(null);
        setPendingDecisionMode(null);
        setDecisionAppliedMode(null);
        setSelectedDecisionMarker(null);
      } else if (mode === 'high-load' || mode === 'packet-loss' || mode === 'cable-cut') {
        setPendingDecisionMode(mode);
        setDecisionAppliedMode(null);
        setActiveDecision(null);
        setSelectedDecisionMarker(null);
      }
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
    useEffect(() => {
      if (activeMode === 'normal') {
        setPendingDecisionMode(null);
        setDecisionAppliedMode(null);
        setActiveDecision(null);
        setSelectedDecisionMarker(null);
      }
    }, [activeMode]);

    const shouldShowDecisionCard =
      !!activeDecision &&
      pendingDecisionMode === activeMode &&
      decisionAppliedMode !== activeMode;
    const canShowCompareControls = activeMode !== 'normal' && decisionAppliedMode === activeMode;
    const closeCompareDialog = () => {
      if (compareMode) {
        onToggleCompare?.();
      }
    };

    useEffect(() => {
      if (!compareMode) return;
      const onKeyDown = (event: globalThis.KeyboardEvent) => {
        if (event.key === 'Escape') {
          closeCompareDialog();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [compareMode]);
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
    const modeLegendItems = useMemo(() => {
      const base = getGlobeLegendItems(activeMode, null);
      if (decisionAppliedMode === activeMode && selectedDecisionMarker) {
        base.push({
          id: 'decision-choice-inline',
          symbol: selectedDecisionMarker.code,
          text: selectedDecisionMarker.meaning,
          tone: 'info',
        });
        base.push({
          id: 'decision-impact-inline',
          symbol: '+ / !',
          text: 'City marker: + is improving, ! is under stress.',
          tone: 'info',
        });
      }
      return base.slice(0, 4);
    }, [activeMode, decisionAppliedMode, selectedDecisionMarker]);

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
            onClick={() => void handleSimChip('high-load', 'Simulate rush hour / high load. Explain in 3 short lines with labels "What you see:", "Why it happens:", "User impact:". Include clear real-world causes in plain English. End by asking me which priority I want to choose first.')}
          >
            🚦 Rush Hour
          </button>
          <button
            className={`sim-chip sim-warn ${activeMode === 'packet-loss' ? 'sim-active' : ''}`}
            disabled={loading}
            onClick={() => void handleSimChip('packet-loss', 'Simulate packet loss. Explain in 3 short lines with labels "What you see:", "Why it happens:", "User impact:". Explain packet as small pieces of data and include clear causes. End by asking me which priority I want to choose first.')}
          >
            📶 Packet Loss
          </button>
          <button
            className={`sim-chip sim-danger ${activeMode === 'cable-cut' ? 'sim-active' : ''}`}
            disabled={loading}
            onClick={() => void handleSimChip('cable-cut', 'Simulate a cable break. Explain in 3 short lines with labels "What you see:", "Why it happens:", "User impact:". Include clear causes like anchors or earthquakes in plain English. End by asking me which priority I want to choose first.')}
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
        <div className="sim-globe-legend">
          <div className="sim-globe-legend-title">🗺️ Globe legend (matches the map)</div>
          <div className="sim-globe-legend-list">
            {modeLegendItems.map((item) => (
              <div key={item.id} className="sim-globe-legend-item">
                <span className={`sim-globe-legend-symbol sim-globe-legend-symbol--${item.tone}`}>
                  {item.symbol}
                </span>
                <span className="sim-globe-legend-text">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {activeMode !== 'normal' && !canShowCompareControls && (
          <div className="sim-next-step">
            👉 Next step: choose one priority option below first.
          </div>
        )}

        {/* Compare Mode Toggle */}
        {canShowCompareControls && (
          <button
            className={`compare-toggle ${compareMode ? 'compare-active' : ''}`}
            disabled={loading}
            onClick={() => onToggleCompare?.()}
            title="Show before/after numbers"
          >
            📊 {compareMode ? 'Hide' : 'Show'} detailed comparison
          </button>
        )}
      </div>

      {/* Compare Panel (center modal) */}
      {compareMode && canShowCompareControls && (
        <div className="compare-modal-overlay" onClick={closeCompareDialog}>
          <div className="compare-modal-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="compare-modal-header">
              <div className="compare-modal-title">📊 Detailed Comparison</div>
              <button
                className="compare-modal-close"
                onClick={closeCompareDialog}
                title="Close details"
              >
                ✕
              </button>
            </div>
            <div className="compare-modal-body">
              <ModeComparePanel
                mode={(activeMode as any) || 'normal'}
                isVisible={true}
              />
            </div>
          </div>
        </div>
      )}

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
        {shouldShowDecisionCard && (
          <div className="chat-message ai">
            <div className="ai-dot" />
            <div className="message-content-wrap decision-inline-wrap">
              <div className="decision-inline-text">Which one should we prioritize?</div>
              <DecisionCard
                decision={{
                  id: activeDecision.mode,
                  mode: activeDecision.mode,
                  question: activeDecision.question,
                  options: activeDecision.options.map((opt) => ({
                    ...opt,
                    emoji: opt.label.split(' ')[0],
                  })),
                  recommended: activeDecision.recommended,
                  why: activeDecision.why,
                }}
                onSelectOption={(optionId) => {
                  const selectedOption = activeDecision.options.find((opt) => opt.id === optionId);
                  if (selectedOption) {
                    const consequence = calculateConsequence(activeDecision.mode, optionId);
                    const markerCode = getDecisionMarker(activeDecision.mode, optionId);
                    const markerMeaning = getDecisionMarkerMeaning(activeDecision.mode, optionId);
                    onDecisionApplied?.({
                      mode: activeDecision.mode,
                      selectedOptionId: optionId,
                      selectedOptionLabel: selectedOption.label,
                      consequence,
                      appliedAt: Date.now(),
                    });
                    setDecisionAppliedMode(activeDecision.mode);
                    setPendingDecisionMode(null);
                    setActiveDecision(null);
                    setSelectedDecisionMarker({ code: markerCode, meaning: markerMeaning });
                    void send(
                      buildPriorityFollowupPrompt(
                        activeDecision.mode,
                        optionId,
                        selectedOption.label,
                        consequence.summary,
                        consequence.tradeoff,
                        consequence.userExperience,
                      ),
                    );
                  }
                }}
                isLoading={loading}
              />
            </div>
          </div>
        )}
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
