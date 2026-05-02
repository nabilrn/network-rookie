import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import type { KeyboardEvent } from 'react';
import { useGeminiChat, type JourneyResponse, type GeminiPayload } from '../hooks/useGeminiChat';
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
  onJourney: (payload: JourneyResponse) => void;
  onScenario: (mode: string) => void;
  onAction?: (action: 'SET_MODE' | 'FOCUS_CITY', payload: string) => void;
}

export interface ChatInterfaceRef {
  reset: () => void;
}

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(
  ({ selectedCity, selectedArc, simulationMode, osiStep, onJourney, onScenario, onAction }, ref) => {
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

  return (
    <div className="chat-interface">
      {/* Simulation Control Bar */}
      <div className="sim-control-bar">
        <div className="sim-bar-label">⚡ Simulation Controls</div>
        <div className="sim-chips">
          <button
            className={`sim-chip ${activeMode === 'normal' ? 'sim-active' : ''}`}
            disabled={loading}
            onClick={() => void handleSimChip('normal', 'Set the network to normal mode and explain what normal traffic looks like')}
          >
            🌐 Normal
          </button>
          <button
            className={`sim-chip sim-warn ${activeMode === 'high-load' ? 'sim-active' : ''}`}
            disabled={loading}
            onClick={() => void handleSimChip('high-load', 'Simulate rush hour / high load on the global network and explain what happens')}
          >
            🚦 Rush Hour
          </button>
          <button
            className={`sim-chip sim-warn ${activeMode === 'packet-loss' ? 'sim-active' : ''}`}
            disabled={loading}
            onClick={() => void handleSimChip('packet-loss', 'Simulate packet loss on the network and explain what packet loss means')}
          >
            📶 Packet Loss
          </button>
          <button
            className={`sim-chip sim-danger ${activeMode === 'cable-cut' ? 'sim-active' : ''}`}
            disabled={loading}
            onClick={() => void handleSimChip('cable-cut', 'Simulate a cable break / cable cut and explain the impact on global internet')}
          >
            ✂️ Cable Break
          </button>
        </div>
      </div>

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
      return { text: parsed.story, showGlobeHint: true };
    }
    if (parsed.type === 'fact' && typeof parsed.content === 'string') {
      const emoji = typeof parsed.emoji === 'string' ? parsed.emoji : '';
      return { text: `${emoji} ${parsed.content}`.trim(), showGlobeHint: false };
    }
    if (parsed.type === 'action' && typeof parsed.message === 'string') {
      return { text: parsed.message, showGlobeHint: true };
    }
  } catch {
    return { text, showGlobeHint: false };
  }

  return { text, showGlobeHint: false };
}
