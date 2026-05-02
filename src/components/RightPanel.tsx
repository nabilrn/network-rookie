import { useRef, forwardRef, useImperativeHandle } from 'react';
import { ChatInterface, ChatInterfaceRef } from './ChatInterface';
import { resolveCityIndex } from '../data/network';
import type { JourneyResponse } from '../hooks/useGeminiChat';
import './RightPanel.css';

interface RightPanelProps {
  selectedCity: number | null;
  selectedArc: number | null;
  simulationMode: string | null;
  osiStep: number | null;
  setOsiStep: (step: number | null) => void;
  onClearSelection?: () => void;
  onCitySelect?: (cityIndex: number | null) => void;
  onModeChange?: (mode: string | null) => void;
}

export interface RightPanelRef {
  resetChat: () => void;
}

export const RightPanel = forwardRef<RightPanelRef, RightPanelProps>(
  ({ selectedCity, selectedArc, simulationMode, osiStep, setOsiStep, onClearSelection, onCitySelect, onModeChange }, ref) => {
    const chatRef = useRef<ChatInterfaceRef>(null);

    useImperativeHandle(ref, () => ({
      resetChat: () => {
        chatRef.current?.reset();
      },
    }));

    const handleJourney = (_payload: JourneyResponse) => {
      setOsiStep(0);
    };

    const handleScenario = (mode: string) => {
      onModeChange?.(mode);
    };

    const handleAction = (action: 'SET_MODE' | 'FOCUS_CITY', payload: string) => {
      if (action === 'SET_MODE') {
        onModeChange?.(payload);
      } else if (action === 'FOCUS_CITY') {
        const cityIndex = resolveCityIndex(payload);
        if (cityIndex !== -1) {
          onClearSelection?.();
          onCitySelect?.(cityIndex);
        }
      }
    };

    return (
      <div className="panel-section">
        {/* Header */}
        <div className="panel-mode-header">
          <div className="panel-brand">
            <span className="brand-icon">🤖</span>
            <span className="brand-text">AI NETWORK COPILOT</span>
          </div>
          <div className="status-badge">
            <span className="status-dot" />
            <span className="status-label">ACTIVE</span>
          </div>
        </div>

        {/* Full AI Chat */}
        <ChatInterface
          ref={chatRef}
          selectedCity={selectedCity}
          selectedArc={selectedArc}
          simulationMode={simulationMode}
          osiStep={osiStep}
          onJourney={handleJourney}
          onScenario={handleScenario}
          onAction={handleAction}
        />
      </div>
    );
  }
);

RightPanel.displayName = 'RightPanel';
