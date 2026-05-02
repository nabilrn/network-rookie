import { useState, useEffect } from 'react';

export type MissionStatus = 'inactive' | 'active' | 'success' | 'failed';

export interface Mission {
  id: string;
  title: string;
  goal: string;
  fromId: string;
  toId: string;
  status: MissionStatus;
  completedAt?: number;
}

// Get initial theme from localStorage or system preference
const getInitialTheme = (): 'dark' | 'light' => {
  // Check localStorage first
  const savedTheme = localStorage.getItem('network-viz-theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }

  // Fall back to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }

  return 'dark';
};

export function useAppState() {
  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [selectedArc, setSelectedArc] = useState<number | null>(null);
  const [simulationMode, setSimulationMode] = useState<string | null>(null);
  const [osiStep, setOsiStep] = useState<number | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(getInitialTheme);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('network-viz-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

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

  return {
    selectedCity,
    setSelectedCity,
    selectedArc,
    setSelectedArc,
    simulationMode,
    setSimulationMode,
    osiStep,
    setOsiStep,
    theme,
    setTheme,
    toggleTheme,
    activeMission,
    setActiveMission,
    startMission,
    completeMission,
    failMission,
    resetMission,
  };
}
