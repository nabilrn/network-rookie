import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router';
import { LandingPage } from '../components/LandingPage';
import { GlobeExperience } from '../components/GlobeExperience';
import './App.css';

const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '');

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
  return (
    <BrowserRouter basename={routerBase}>
      <RestorePagesRoute />
    </BrowserRouter>
  );
}
