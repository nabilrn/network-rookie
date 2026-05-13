import { HashRouter, Routes, Route } from 'react-router';
import { LandingPage } from '../components/LandingPage';
import { GlobeExperience } from '../components/GlobeExperience';
import './App.css';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<GlobeExperience />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </HashRouter>
  );
}
