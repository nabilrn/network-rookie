import { useRef } from 'react';
import { useAppState } from '../hooks/useAppState';
import type { DecisionVisualImpact } from '../utils/simulationDecisionEngine';
import { BrowserChrome } from '../components/BrowserChrome';
import { GlobeSection, GlobeSectionRef } from '../components/GlobeSection';
import { RightPanel, RightPanelRef } from '../components/RightPanel';
import { Footer } from '../components/Footer';
import { InactivityWatcher } from '../components/InactivityWatcher';
import { OfflineBanner } from '../components/OfflineBanner';
import '../app/App.css';

export const GlobeExperience = () => {
  const {
    selectedCity,
    setSelectedCity,
    selectedArc,
    setSelectedArc,
    simulationMode,
    setSimulationMode,
    osiStep,
    setOsiStep,
    activeMission,
    startMission,
    completeMission,
    resetMission,
    compareMode,
    setCompareMode,
    toggleCompareMode,
    decisionImpact,
    setDecisionImpact,
    scenarioNarrative,
    setScenarioNarrative,
  } = useAppState();

  const globeSectionRef = useRef<GlobeSectionRef>(null);
  const rightPanelRef = useRef<RightPanelRef>(null);

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
    setScenarioNarrative(null);
    handleChatReset();
  };

  const handleDecisionApplied = (impact: DecisionVisualImpact) => {
    setDecisionImpact(impact);
  };

  const handleModeChange = (mode: string | null) => {
    if (simulationMode !== mode) {
      setScenarioNarrative(null);
    }
    setSimulationMode(mode);
    setCompareMode(false);
    setDecisionImpact(null);
    setSelectedArc(null);
  };

  const handleSimulationControlSelect = (mode: string) => {
    if (rightPanelRef.current) {
      rightPanelRef.current.applySimulationMode(mode);
      return;
    }
    handleModeChange(mode);
  };

  const scenarioRoute =
    scenarioNarrative?.mode === simulationMode
      ? {
          fromId: scenarioNarrative.flowFromId ?? scenarioNarrative.fromId,
          toId: scenarioNarrative.flowToId ?? scenarioNarrative.toId,
        }
      : null;

  return (
    <div className="app-shell">
      <OfflineBanner />
      <BrowserChrome />
      <div className="workspace">
        <GlobeSection
          ref={globeSectionRef}
          selectedCity={selectedCity}
          selectedArc={selectedArc}
          simulationMode={simulationMode}
          decisionImpact={decisionImpact}
          scenarioStory={scenarioNarrative?.mode === simulationMode ? scenarioNarrative.story : null}
          scenarioRoute={scenarioRoute}
          onResetAll={handleSessionReset}
          onCitySelect={setSelectedCity}
          onArcSelect={setSelectedArc}
          onModeChange={handleModeChange}
          onSimulationSelect={handleSimulationControlSelect}
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
          onArcSelect={setSelectedArc}
          onModeChange={handleModeChange}
          onMissionStart={startMission}
          onMissionComplete={completeMission}
          onMissionReset={resetMission}
          onDecisionApplied={handleDecisionApplied}
          onScenarioNarrative={setScenarioNarrative}
        />
      </div>
      <Footer />
      <InactivityWatcher
        globeSectionRef={globeSectionRef}
        onChatReset={handleChatReset}
        onReset={handleSessionReset}
      />
    </div>
  );
};
