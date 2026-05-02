import { useState, useEffect } from 'react';

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

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('network-viz-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
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
  };
}
