import { useState, useEffect } from 'react';
import './OfflineBanner.css';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="offline-banner dark">
      <div className="offline-content">
        <svg className="offline-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 2C11.866 2 15 5.134 15 9C15 12.866 11.866 16 8 16C4.134 16 1 12.866 1 9C1 5.134 4.134 2 8 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M5 9L7 11L11 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
          />
          <line
            x1="3" y1="13" x2="13" y2="3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="offline-text">Running in offline mode — AI tutor unavailable</span>
      </div>
    </div>
  );
}
