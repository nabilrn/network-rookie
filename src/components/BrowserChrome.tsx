import './BrowserChrome.css';

interface BrowserChromeProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export function BrowserChrome({ theme, toggleTheme }: BrowserChromeProps) {
  return (
    <div className="browser-bar">
      <div className="traffic-lights">
        <div className="tl r"></div>
        <div className="tl y"></div>
        <div className="tl g"></div>
      </div>
      <div className="nav-btns">
        <div className="nav-btn">←</div>
        <div className="nav-btn">→</div>
        <div className="nav-btn">↻</div>
      </div>
      <div className="browser-tabs">
        <div className="tab active">Network Rookie</div>
        <div className="tab">Infra</div>
        <div className="tab">Logs</div>
      </div>
      <div className="url-bar">
        <span className="url-lock">🔒</span>
        <span className="url-host">Network Rookie:</span>
        <span className="url-path">A beginner guide to the global internet</span>
      </div>
      {/* TODO: Remove DEV MODE badge before production deploy */}
      <div className="dev-mode-badge" title="Development mode - remove before production">
        DEV MODE
      </div>
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        onKeyDown={(e) => e.key === 'Enter' && toggleTheme()}
        title="Toggle theme (keyboard accessible)"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        tabIndex={0}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  );
}
