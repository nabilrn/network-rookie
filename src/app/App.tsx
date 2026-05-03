import { useEffect, useRef } from 'react';
import { useAppState } from '../hooks/useAppState';
import type { DecisionVisualImpact } from '../utils/simulationDecisionEngine';
import { BrowserChrome } from '../components/BrowserChrome';
import { GlobeSection, GlobeSectionRef } from '../components/GlobeSection';
import { RightPanel, RightPanelRef } from '../components/RightPanel';
import { Footer } from '../components/Footer';
import { InactivityWatcher } from '../components/InactivityWatcher';
import { OfflineBanner } from '../components/OfflineBanner';
import './App.css';

export default function App() {
  const {
    selectedCity,
    setSelectedCity,
    selectedArc,
    setSelectedArc,
    simulationMode,
    setSimulationMode,
    osiStep,
    setOsiStep,
    theme,
    toggleTheme,
    activeMission,
    startMission,
    completeMission,
    resetMission,
    compareMode,
    setCompareMode,
    toggleCompareMode,
    decisionImpact,
    setDecisionImpact,
  } = useAppState();

  const globeSectionRef = useRef<GlobeSectionRef>(null);
  const rightPanelRef = useRef<RightPanelRef>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const handleChatReset = () => {
    rightPanelRef.current?.resetChat();
  };

  const handleClearSelection = () => {
    setSelectedCity(null);
    setSelectedArc(null);
  };

  const handleSessionReset = () => {
    setSelectedCity(null);
    setSelectedArc(null);
    setSimulationMode(null);
    setOsiStep(null);
    resetMission();
    setCompareMode(false);
    setDecisionImpact(null);
    handleChatReset();
  };

  const handleDecisionApplied = (impact: DecisionVisualImpact) => {
    setDecisionImpact(impact);
  };

  const handleModeChange = (mode: string | null) => {
    setSimulationMode(mode);
    setCompareMode(false);
    setDecisionImpact(null);
  };

  return (
    <>
      <OfflineBanner theme={theme} />
      <BrowserChrome theme={theme} toggleTheme={toggleTheme} />
      <div className="workspace">
        <GlobeSection
          ref={globeSectionRef}
          theme={theme}
          selectedCity={selectedCity}
          selectedArc={selectedArc}
          simulationMode={simulationMode}
          decisionImpact={decisionImpact}
          onResetAll={handleSessionReset}
          onCitySelect={setSelectedCity}
          onArcSelect={setSelectedArc}
          onModeChange={handleModeChange}
        />
        <RightPanel
          ref={rightPanelRef}
          selectedCity={selectedCity}
          selectedArc={selectedArc}
          simulationMode={simulationMode}
          osiStep={osiStep}
          activeMission={activeMission}
          compareMode={compareMode}
          setOsiStep={setOsiStep}
          toggleCompareMode={toggleCompareMode}
          onClearSelection={handleClearSelection}
          onCitySelect={setSelectedCity}
          onModeChange={handleModeChange}
          onMissionStart={startMission}
          onMissionComplete={completeMission}
          onMissionReset={resetMission}
          onDecisionApplied={handleDecisionApplied}
        />
      </div>
      <Footer />
      <InactivityWatcher
        globeSectionRef={globeSectionRef}
        onChatReset={handleChatReset}
        onReset={handleSessionReset}
        theme={theme}
      />
    </>
  );
}
