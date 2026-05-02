The Fix — 3 Files to Change
1. App.tsx — Pass full state down
tsximport { useAppState } from '../hooks/useAppState';
import { CITIES, CONNECTIONS } from '../data/network';

export default function App() {
  const appState = useAppState();
  const globeSectionRef = useRef<GlobeSectionRef>(null);
  const rightPanelRef = useRef<RightPanelRef>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appState.theme);
  }, [appState.theme]);

  const handleChatReset = () => {
    rightPanelRef.current?.resetChat();
  };

  return (
    <>
      <OfflineBanner theme={appState.theme} />
      <BrowserChrome theme={appState.theme} toggleTheme={appState.toggleTheme} />
      <div className="workspace">
        <GlobeSection
          ref={globeSectionRef}
          theme={appState.theme}
          onCitySelect={appState.setSelectedCity}   // ← ADD
          onArcSelect={appState.setSelectedArc}     // ← ADD
          onModeChange={appState.setSimulationMode} // ← ADD
        />
        <RightPanel
          ref={rightPanelRef}
          selectedCity={appState.selectedCity}       // ← ADD
          selectedArc={appState.selectedArc}         // ← ADD
          simulationMode={appState.simulationMode}   // ← ADD
          osiStep={appState.osiStep}                 // ← ADD
          setOsiStep={appState.setOsiStep}           // ← ADD
        />
      </div>
      <Footer />
      <InactivityWatcher
        globeSectionRef={globeSectionRef}
        onChatReset={handleChatReset}
        theme={appState.theme}
        onReset={() => {                             // ← ADD
          appState.setSelectedCity(null);
          appState.setSelectedArc(null);
          appState.setSimulationMode('normal');
          appState.setOsiStep(null);
          handleChatReset();
        }}
      />
    </>
  );
}

2. GlobeSection.tsx — Fire callbacks on click, keep STATE in sync
Update the props interface and wire the callbacks into the existing click handlers. Minimal changes — don't touch anything else:
tsx// Update props interface
interface GlobeSectionProps {
  theme: 'dark' | 'light';
  onCitySelect: (index: number | null) => void;  // ← ADD
  onArcSelect: (index: number | null) => void;   // ← ADD
  onModeChange: (mode: string) => void;          // ← ADD
}

// Update component signature
export const GlobeSection = forwardRef<GlobeSectionRef, GlobeSectionProps>(
  ({ theme, onCitySelect, onArcSelect, onModeChange }, ref) => {
Then in onPointClick — add one line after the STATE update:
tsx.onPointClick((point: any) => {
  const clickedIndex = CITIES.findIndex(
    city => city.lat === point.lat && city.lng === point.lng
  );
  if (clickedIndex !== -1) {
    STATE.selectedCity = STATE.selectedCity === clickedIndex ? null : clickedIndex;
    onCitySelect(STATE.selectedCity); // ← ADD THIS LINE
    render();
  }
})
In onArcClick — same pattern:
tsx.onArcClick((arc: any) => {
  const clickedIndex = arcsData.findIndex(a =>
    a.startLat === arc.startLat && a.startLng === arc.startLng &&
    a.endLat === arc.endLat && a.endLng === arc.endLng
  );
  if (clickedIndex !== -1) {
    STATE.selectedArc = STATE.selectedArc === clickedIndex ? null : clickedIndex;
    STATE.selectedCity = null;
    onArcSelect(STATE.selectedArc);   // ← ADD THIS LINE
    onCitySelect(null);               // ← ADD THIS LINE
    render();
  }
})
In onGlobeClick:
tsxglobe.onGlobeClick(() => {
  if (STATE.selectedCity !== null || STATE.selectedArc !== null) {
    STATE.selectedCity = null;
    STATE.selectedArc = null;
    onCitySelect(null);  // ← ADD
    onArcSelect(null);   // ← ADD
    render();
  }
});
In handleModeChange:
tsxconst handleModeChange = (mode: string) => {
  STATE.simulationMode = mode;
  onModeChange(mode);  // ← ADD
  render();
};

3. RightPanel.tsx — Accept and pass down state
tsx// Update props interface
interface RightPanelProps {
  selectedCity: number | null;
  selectedArc: number | null;
  simulationMode: string | null;
  osiStep: number | null;
  setOsiStep: (step: number | null) => void;
}

export interface RightPanelRef {
  resetChat: () => void;
}

export const RightPanel = forwardRef<RightPanelRef, RightPanelProps>(
  ({ selectedCity, selectedArc, simulationMode, osiStep, setOsiStep }, ref) => {
  const [osiCollapsed, setOsiCollapsed] = useState(false);
  const chatRef = useRef<ChatInterfaceRef>(null);

  useImperativeHandle(ref, () => ({
    resetChat: () => chatRef.current?.reset(),
  }));

  return (
    <div className="panel-section">
      <div className="panel-header">
        <div className="panel-eye">// EDUCATIONAL OVERLAY v2.1</div>
        <div className="panel-title">
          UNDERSTANDING THE INTERNET<br />
          <span>FOR LAYPEOPLE</span>
        </div>
      </div>

      {/* NOW SelectionDrawer knows what's selected */}
      <SelectionDrawer
        selectedCity={selectedCity}
        selectedArc={selectedArc}
      />

      <div className={`panel-cards ${osiCollapsed ? 'collapsed' : ''}`}>
        <div className="panel-cards-header">
          <span className="panel-cards-title">OSI LAYER BREAKDOWN</span>
          <button className="collapse-btn" onClick={() => setOsiCollapsed(!osiCollapsed)}>
            {osiCollapsed ? '▼' : '▲'}
          </button>
        </div>
        {!osiCollapsed && (
          <div className="panel-cards-content">
            {/* NOW OSICards knows active step */}
            <OSICards
              activeStep={osiStep}
              onStepChange={setOsiStep}
              autoPlay={selectedArc !== null}
            />
          </div>
        )}
      </div>

      {/* NOW ChatInterface knows full context */}
      <ChatInterface
        ref={chatRef}
        selectedCity={selectedCity}
        selectedArc={selectedArc}
        simulationMode={simulationMode}
        osiStep={osiStep}
      />
    </div>
  );
});

After These 3 Files — What Unlocks
Everything in the panel can now react to the globe. Specifically:

SelectionDrawer receives selectedCity and selectedArc as props — look up real data from CITIES and CONNECTIONS arrays directly, no API needed
ChatInterface receives full context — ready to build the Gemini prompt from real state
OSICards receives autoPlay={selectedArc !== null} — animation triggers automatically when an arc is clicked
InactivityWatcher gets a real onReset that clears everything