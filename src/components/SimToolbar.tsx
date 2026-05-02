import './SimToolbar.css';

interface SimToolbarProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
}

const MODES = [
  { id: 'normal', label: '🌐 Normal' },
  { id: 'high-load', label: '🚦 Rush Hour' },
  { id: 'packet-loss', label: '📶 Bad Signal' },
  { id: 'cable-cut', label: '✂️ Cable Breaks' },
];

const MODE_DESCRIPTIONS: Record<string, string> = {
  'high-load': 'Internet highways are extra busy right now',
  'packet-loss': 'Some data packets are getting lost on the way',
  'cable-cut': 'Tap any route to simulate a cable failure',
};

export function SimToolbar({ currentMode, onModeChange }: SimToolbarProps) {
  const showBanner = currentMode !== 'normal' && MODE_DESCRIPTIONS[currentMode];

  return (
    <div className="sim-toolbar">
      <div className="sim-toolbar-top">
        <div className="sim-label">SIMULATION MODE</div>
        <div className="sim-buttons">
          {MODES.map(mode => (
            <button
              key={mode.id}
              className={`sim-btn ${currentMode === mode.id ? 'active' : ''}`}
              onClick={() => onModeChange(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      {showBanner && (
        <div className="sim-mode-banner" key={currentMode}>
          {MODE_DESCRIPTIONS[currentMode]}
        </div>
      )}
    </div>
  );
}
