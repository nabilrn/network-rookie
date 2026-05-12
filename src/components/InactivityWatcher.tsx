import { useEffect, useState, useCallback, useRef } from 'react';
import { GlobeSectionRef } from './GlobeSection';
import './InactivityWatcher.css';

interface InactivityWatcherProps {
  globeSectionRef: React.RefObject<GlobeSectionRef | null>;
  onChatReset?: () => void;
  onReset?: () => void;
}

const INACTIVITY_TIMEOUT = 2.5 * 60 * 1000; // 2.5 minutes
const COUNTDOWN_DURATION = 30; // 30 seconds

export function InactivityWatcher({ globeSectionRef, onChatReset, onReset }: InactivityWatcherProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout>>(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval>>(0);

  const resetSession = useCallback(() => {
    // TODO: SERVICE - Log session reset analytics event
    // API endpoint: POST /api/analytics/session-reset
    // Request body: { reason: 'inactivity', timestamp: Date.now() }

    // Reset all state via callback
    if (onReset) {
      onReset();
    }

    // TODO: SERVICE - Clear any cached user session data
    // localStorage.removeItem('userSessionData');
    // sessionStorage.clear();

    // Return globe to auto-rotating default view
    const globeRef = globeSectionRef.current?.globeRef;
    if (globeRef?.current) {
      const globe = globeRef.current;

      // Reset camera position to default view
      globe.pointOfView({
        lat: 0,
        lng: 0,
        altitude: 2.5,
      }, 1000);

      // Ensure auto-rotate is enabled
      if (globe.controls()) {
        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.35;
      }
    }

    // Hide overlay
    setShowOverlay(false);
    setCountdown(COUNTDOWN_DURATION);

    console.log('🔄 Session reset due to inactivity');
  }, [globeSectionRef, onReset]);

  const startCountdown = useCallback(() => {
    setShowOverlay(true);
    setCountdown(COUNTDOWN_DURATION);

    let secondsLeft = COUNTDOWN_DURATION;

    countdownTimerRef.current = setInterval(() => {
      secondsLeft -= 1;
      setCountdown(secondsLeft);

      if (secondsLeft <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }
        resetSession();
      }
    }, 1000);
  }, [resetSession]);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // If overlay is showing, cancel countdown
    if (showOverlay) {
      setShowOverlay(false);
      setCountdown(COUNTDOWN_DURATION);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    }

    // Reset inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      startCountdown();
    }, INACTIVITY_TIMEOUT);
  }, [showOverlay, startCountdown]);

  const handleKeepExploring = () => {
    handleActivity();
  };

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'click'];

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initialize inactivity timer
    handleActivity();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [handleActivity]);

  if (!showOverlay) return null;

  return (
    <div className="inactivity-overlay dark">
      <div className="inactivity-content">
        <div className="countdown-number">{countdown}</div>
        <div className="countdown-label">Resetting session…</div>
        <button className="keep-exploring-btn" onClick={handleKeepExploring}>
          Keep exploring →
        </button>
      </div>
    </div>
  );
}
