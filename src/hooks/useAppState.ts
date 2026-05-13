import { useState } from 'react';
import type { DecisionVisualImpact } from '../utils/simulationDecisionEngine';

export type MissionStatus = 'inactive' | 'active' | 'success' | 'failed';

export interface ScenarioNarrative {
  mode: 'high-load' | 'packet-loss' | 'cable-cut';
  story: string;
  fromId?: string;
  toId?: string;
  flowFromId?: string;
  flowToId?: string;
}

export interface Mission {
  id: string;
  title: string;
  goal: string;
  fromId: string;
  toId: string;
  status: MissionStatus;
  completedAt?: number;
}

export function useAppState() {
  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [selectedArc, setSelectedArc] = useState<number | null>(null);
  const [simulationMode, setSimulationMode] = useState<string | null>(null);
  const [osiStep, setOsiStep] = useState<number | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [decisionImpact, setDecisionImpact] = useState<DecisionVisualImpact | null>(null);
  const [scenarioNarrative, setScenarioNarrative] = useState<ScenarioNarrative | null>(null);

  const startMission = (mission: Mission) => {
    setActiveMission({ ...mission, status: 'active' });
  };

  const completeMission = () => {
    if (activeMission) {
      setActiveMission({ ...activeMission, status: 'success', completedAt: Date.now() });
    }
  };

  const failMission = () => {
    if (activeMission) {
      setActiveMission({ ...activeMission, status: 'failed' });
    }
  };

  const resetMission = () => {
    setActiveMission(null);
  };

  const toggleCompareMode = () => {
    setCompareMode(prev => !prev);
  };

  return {
    selectedCity,
    setSelectedCity,
    selectedArc,
    setSelectedArc,
    simulationMode,
    setSimulationMode,
    osiStep,
    setOsiStep,
    activeMission,
    setActiveMission,
    startMission,
    completeMission,
    failMission,
    resetMission,
    compareMode,
    setCompareMode,
    toggleCompareMode,
    decisionImpact,
    setDecisionImpact,
    scenarioNarrative,
    setScenarioNarrative,
  };
}
