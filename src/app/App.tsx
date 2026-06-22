import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router';
import { LandingPage } from '../components/LandingPage';
import { GlobeExperience } from '../components/GlobeExperience';
import './App.css';

const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '');
const MIN_SUPPORTED_WIDTH = 900;

function isUnsupportedViewport() {
  const isSmallScreen = window.innerWidth < MIN_SUPPORTED_WIDTH;
  const isMobileLike =
    window.matchMedia('(hover: none), (pointer: coarse)').matches ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      window.navigator.userAgent,
    );

  return isSmallScreen || isMobileLike;
}

function useUnsupportedViewport() {
  const [unsupported, setUnsupported] = useState(() => isUnsupportedViewport());

  useEffect(() => {
    const updateViewportSupport = () => {
      setUnsupported(isUnsupportedViewport());
    };

    window.addEventListener('resize', updateViewportSupport);
    window.addEventListener('orientationchange', updateViewportSupport);

    return () => {
      window.removeEventListener('resize', updateViewportSupport);
      window.removeEventListener('orientationchange', updateViewportSupport);
    };
  }, []);

  return unsupported;
}

function UnsupportedViewportMessage() {
  return (
    <main className="unsupported-viewport" aria-labelledby="unsupported-viewport-title">
      <section className="unsupported-viewport__panel">
        <p className="unsupported-viewport__eyebrow">Network Rookie</p>
        <h1 id="unsupported-viewport-title">This device is not supported.</h1>
        <p>
          Network Rookie requires a desktop or laptop screen at least
          {` ${MIN_SUPPORTED_WIDTH}px `}wide so the network simulation and globe
          visualization can run properly.
        </p>
        <p className="unsupported-viewport__hint">
          Please reopen this app on a desktop device or increase your browser window size.
        </p>
      </section>
    </main>
  );
}

function RestorePagesRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    const route = sessionStorage.getItem('network-rookie-route');
    if (!route) return;
    sessionStorage.removeItem('network-rookie-route');
    navigate(route, { replace: true });
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/explore" element={<GlobeExperience />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

export default function App() {
  const unsupportedViewport = useUnsupportedViewport();

  if (unsupportedViewport) {
    return <UnsupportedViewportMessage />;
  }

  return (
    <BrowserRouter basename={routerBase}>
      <RestorePagesRoute />
    </BrowserRouter>
  );
}
