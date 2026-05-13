import { BrowserRouter, Routes, Route } from 'react-router';
import { LandingPage } from '../components/LandingPage';
import { GlobeExperience } from '../components/GlobeExperience';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<GlobeExperience />} />
      </Routes>
    </BrowserRouter>
  );
}
