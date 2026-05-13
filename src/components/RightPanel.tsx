import { useRef, forwardRef, useImperativeHandle } from 'react';
import { ChatInterface, ChatInterfaceRef } from './ChatInterface';
import { CONNECTIONS, ensureDirectConnection, resolveCityId, resolveCityIndex } from '../data/network';
import type { JourneyResponse, DecisionResponse } from '../hooks/useGeminiChat';
import type { Mission, ScenarioNarrative } from '../hooks/useAppState';
import type { DecisionVisualImpact } from '../utils/simulationDecisionEngine';
import './RightPanel.css';

interface RightPanelProps {
  selectedCity: number | null;
  selectedArc: number | null;
  simulationMode: string | null;
  osiStep: number | null;
  activeMission: Mission | null;
  compareMode: boolean;
  setOsiStep: (step: number | null) => void;
  toggleCompareMode: () => void;
  onClearSelection?: () => void;
  onCitySelect?: (cityIndex: number | null) => void;
  onArcSelect?: (arcIndex: number | null) => void;
  onModeChange?: (mode: string | null) => void;
  onMissionStart?: (mission: Mission) => void;
  onMissionComplete?: () => void;
  onMissionReset?: () => void;
  onDecision?: (decision: DecisionResponse) => void;
  onDecisionApplied?: (impact: DecisionVisualImpact) => void;
  onScenarioNarrative?: (narrative: ScenarioNarrative) => void;
}

export interface RightPanelRef {
  resetChat: () => void;
  applySimulationMode: (mode: string) => void;
}

export const RightPanel = forwardRef<RightPanelRef, RightPanelProps>(
  ({ selectedCity, selectedArc, simulationMode, osiStep, activeMission, compareMode, setOsiStep, toggleCompareMode, onClearSelection, onCitySelect, onArcSelect, onModeChange, onMissionStart, onMissionComplete, onMissionReset, onDecision, onDecisionApplied, onScenarioNarrative }, ref) => {
    const chatRef = useRef<ChatInterfaceRef>(null);

    useImperativeHandle(ref, () => ({
      resetChat: () => {
        chatRef.current?.reset();
      },
      applySimulationMode: (mode: string) => {
        chatRef.current?.applySimulationMode(mode);
      },
    }));

    const handleJourney = (_payload: JourneyResponse) => {
      setOsiStep(0);
    };

    const handleScenario = (mode: string) => {
      onModeChange?.(mode);
    };

    const handleAction = (action: 'SET_MODE' | 'FOCUS_CITY' | 'SET_MODE_WITH_ARC', payload: string) => {
      if (action === 'SET_MODE') {
        onModeChange?.(payload);
      } else if (action === 'FOCUS_CITY') {
        const cityIndex = resolveCityIndex(payload);
        if (cityIndex !== -1) {
          onClearSelection?.();
          onCitySelect?.(cityIndex);
        }
      } else if (action === 'SET_MODE_WITH_ARC') {
        try {
          const data = JSON.parse(payload) as {
            mode?: unknown;
            arcIndex?: unknown;
            fromId?: unknown;
            toId?: unknown;
            connector?: unknown;
          };
          if (typeof data.mode !== 'string') {
            throw new Error('Invalid mode payload');
          }

          let resolvedArcIndex: number | null = null;
          if (
            typeof data.arcIndex === 'number' &&
            Number.isInteger(data.arcIndex) &&
            data.arcIndex >= 0 &&
            data.arcIndex < CONNECTIONS.length
          ) {
            resolvedArcIndex = data.arcIndex;
          } else {
            let rawFromId: string | null =
              typeof data.fromId === 'string' ? data.fromId : null;
            let rawToId: string | null =
              typeof data.toId === 'string' ? data.toId : null;
            let createIfMissing = true;

            if (typeof data.connector === 'object' && data.connector !== null) {
              const connector = data.connector as Record<string, unknown>;
              if (typeof connector.fromId === 'string' && typeof connector.toId === 'string') {
                rawFromId = connector.fromId;
                rawToId = connector.toId;
              }
              if (typeof connector.createIfMissing === 'boolean') {
                createIfMissing = connector.createIfMissing;
              }
            }

            const fromId = rawFromId ? resolveCityId(rawFromId) : null;
            const toId = rawToId ? resolveCityId(rawToId) : null;
            console.log('[SET_MODE_WITH_ARC] raw from/to', rawFromId, rawToId);
            console.log('[SET_MODE_WITH_ARC] resolved from/to', fromId, toId);
            if (fromId && toId) {
              if (createIfMissing) {
                const ensuredArcIndex = ensureDirectConnection(fromId, toId);
                if (typeof ensuredArcIndex === 'number' && ensuredArcIndex >= 0) {
                  resolvedArcIndex = ensuredArcIndex;
                }
              }
              if (resolvedArcIndex === null) {
                const existingArcIndex = CONNECTIONS.findIndex(
                  (conn) =>
                    (conn.from === fromId && conn.to === toId) ||
                    (conn.from === toId && conn.to === fromId),
                );
                if (existingArcIndex >= 0) {
                  resolvedArcIndex = existingArcIndex;
                }
              }
            }
          }

          console.log('[SET_MODE_WITH_ARC] mode', data.mode);
          console.log('[SET_MODE_WITH_ARC] resolved arc index', resolvedArcIndex);

          // First, set mode (this clears arc via handleModeChange)
          onModeChange?.(data.mode);
          // Then, set the arc in a SEPARATE render cycle so it's applied AFTER
          // handleModeChange's setSelectedArc(null) has been flushed.
          if (resolvedArcIndex !== null) {
            const arcToSet = resolvedArcIndex;
            requestAnimationFrame(() => {
              onCitySelect?.(null);
              onArcSelect?.(arcToSet);
            });
          }
        } catch (e) {
          console.error('Failed to parse SET_MODE_WITH_ARC payload', e);
        }
      }
    };

    return (
      <div className="panel-section">
        {/* Header */}
        <div className="panel-mode-header">
          <div className="panel-brand">
            <span className="brand-text">AI network guide</span>
          </div>
          <div className="status-badge">
            <span className="status-dot" />
            <span className="status-label">Online</span>
          </div>
        </div>

        {/* Full AI Chat */}
        <ChatInterface
          ref={chatRef}
          selectedCity={selectedCity}
          selectedArc={selectedArc}
          simulationMode={simulationMode}
          osiStep={osiStep}
          activeMission={activeMission}
          compareMode={compareMode}
          onJourney={handleJourney}
          onScenario={handleScenario}
          onAction={handleAction}
          onToggleCompare={toggleCompareMode}
          onDecision={onDecision}
          onDecisionApplied={onDecisionApplied}
          onMissionStart={onMissionStart}
          onMissionComplete={onMissionComplete}
          onMissionReset={onMissionReset}
          onScenarioPayload={onScenarioNarrative}
        />
      </div>
    );
  }
);

RightPanel.displayName = 'RightPanel';
