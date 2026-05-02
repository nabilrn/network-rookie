import { useState, useEffect, useRef, useCallback } from 'react';
import './OSICards.css';

interface OSICardsProps {
  activeStep: number | null;
  onStepChange: (step: number | null) => void;
  autoPlay: boolean;
}

export function OSICards({ activeStep, onStepChange, autoPlay }: OSICardsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopAnimation = useCallback(() => {
    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playOSIAnimation = useCallback(() => {
    stopAnimation();
    setIsPlaying(true);
    onStepChange(0);

    let currentStep = 0;
    animationTimerRef.current = setInterval(() => {
      currentStep++;
      if (currentStep > 6) {
        stopAnimation();
      } else {
        onStepChange(currentStep);
      }
    }, 700);
  }, [stopAnimation, onStepChange]);

  // Trigger animation when autoPlay becomes true
  useEffect(() => {
    if (autoPlay) {
      playOSIAnimation();
    }
  }, [autoPlay, playOSIAnimation]);

  const handlePrev = () => {
    stopAnimation();
    onStepChange(activeStep === null || activeStep === 0 ? 6 : activeStep - 1);
  };

  const handleNext = () => {
    stopAnimation();
    onStepChange(activeStep === null || activeStep === 6 ? 0 : activeStep + 1);
  };

  const handlePausePlay = () => {
    if (isPlaying) {
      stopAnimation();
    } else {
      playOSIAnimation();
    }
  };

  const handleCardClick = (index: number) => {
    stopAnimation();
    onStepChange(activeStep === index ? null : index);
  };

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className={`card ca ${activeStep === 0 ? 'active' : ''}`} onClick={() => handleCardClick(0)}>
        <svg className="card-icon" viewBox="0 0 34 34" fill="none">
          <rect x="3" y="5" width="28" height="5" rx="1" fill="rgba(232,160,32,.1)" stroke="#e8a020" strokeWidth=".7" />
          <rect x="5" y="6.5" width="2.5" height="2" rx=".3" fill="#e8a020" opacity=".6" />
          <rect x="9" y="6.5" width="2.5" height="2" rx=".3" fill="#e8a020" opacity=".35" />
          <rect x="26" y="6.5" width="3" height="2" rx="1" fill="#0cb8a2" />
          <rect x="3" y="12" width="28" height="5" rx="1" fill="rgba(232,160,32,.07)" stroke="#e8a020" strokeWidth=".7" />
          <rect x="5" y="13.5" width="2.5" height="2" rx=".3" fill="#e8a020" opacity=".6" />
          <rect x="9" y="13.5" width="2.5" height="2" rx=".3" fill="#e8a020" opacity=".35" />
          <rect x="26" y="13.5" width="3" height="2" rx="1" fill="#0cb8a2" />
          <rect x="3" y="19" width="28" height="5" rx="1" fill="rgba(232,160,32,.05)" stroke="#e8a020" strokeWidth=".7" />
          <rect x="5" y="20.5" width="2.5" height="2" rx=".3" fill="#e8a020" opacity=".5" />
          <rect x="26" y="20.5" width="3" height="2" rx="1" fill="#c97860" />
          <rect x="12" y="26" width="10" height="1.5" rx=".5" fill="#e8a020" opacity=".15" />
        </svg>
        <div className="card-body">
          <div className="card-num">01 / 07</div>
          <div className="card-title">COMPUTERS &amp; SERVERS <span>(THE ORIGIN)</span></div>
          <div className="card-text">Billions of devices storing information, accessible over the network at any moment.</div>
          <div className="card-tag">LAYER 0 — HARDWARE</div>
        </div>
      </div>

      <div className={`card ct ${activeStep === 1 ? 'active' : ''}`} onClick={() => handleCardClick(1)}>
        <svg className="card-icon" viewBox="0 0 34 34" fill="none">
          <rect x="5" y="13" width="24" height="16" rx="1.5" fill="rgba(12,184,162,.08)" stroke="#0cb8a2" strokeWidth=".7" />
          <rect x="8" y="16" width="4" height="6" rx=".5" fill="#0cb8a2" opacity=".45" />
          <rect x="13" y="16" width="4" height="6" rx=".5" fill="#0cb8a2" opacity=".35" />
          <rect x="18" y="16" width="4" height="6" rx=".5" fill="#0cb8a2" opacity=".25" />
          <rect x="23" y="16" width="4" height="6" rx=".5" fill="#0cb8a2" opacity=".45" />
          <rect x="8" y="24" width="4" height="3" rx=".5" fill="#0cb8a2" opacity=".3" />
          <rect x="13" y="24" width="4" height="3" rx=".5" fill="#0cb8a2" opacity=".25" />
          <rect x="18" y="24" width="4" height="3" rx=".5" fill="#0cb8a2" opacity=".3" />
          <rect x="23" y="24" width="4" height="3" rx=".5" fill="#e8a020" opacity=".5" />
          <path d="M3 13 L9 7 L25 7 L31 13" stroke="#0cb8a2" strokeWidth=".7" fill="none" opacity=".5" />
          <line x1="17" y1="7" x2="17" y2="13" stroke="#0cb8a2" strokeWidth=".5" opacity=".35" />
        </svg>
        <div className="card-body">
          <div className="card-num">02 / 07</div>
          <div className="card-title">DATA CENTERS <span>(DIGITAL CITIES)</span></div>
          <div className="card-text">Massive climate-controlled facilities housing thousands of interconnected servers.</div>
          <div className="card-tag">LAYER 1 — INFRASTRUCTURE</div>
        </div>
      </div>

      <div className={`card cs ${activeStep === 2 ? 'active' : ''}`} onClick={() => handleCardClick(2)}>
        <svg className="card-icon" viewBox="0 0 34 34" fill="none">
          <rect x="3" y="17" width="8" height="10" rx="1" fill="rgba(91,143,212,.1)" stroke="#5b8fd4" strokeWidth=".7" />
          <rect x="4.5" y="18.5" width="5" height="1.5" rx=".3" fill="#5b8fd4" opacity=".5" />
          <rect x="4.5" y="21" width="5" height="1.5" rx=".3" fill="#5b8fd4" opacity=".3" />
          <rect x="13" y="12" width="8" height="10" rx="1" fill="rgba(91,143,212,.1)" stroke="#5b8fd4" strokeWidth=".7" />
          <rect x="14.5" y="13.5" width="5" height="1.5" rx=".3" fill="#5b8fd4" opacity=".5" />
          <rect x="14.5" y="16" width="5" height="1.5" rx=".3" fill="#5b8fd4" opacity=".3" />
          <rect x="23" y="7" width="8" height="10" rx="1" fill="rgba(91,143,212,.22)" stroke="#5b8fd4" strokeWidth="1" />
          <rect x="24.5" y="8.5" width="5" height="1.5" rx=".3" fill="#5b8fd4" opacity=".7" />
          <rect x="24.5" y="11" width="5" height="1.5" rx=".3" fill="#5b8fd4" opacity=".5" />
          <path d="M7 17 L13 12" stroke="#5b8fd4" strokeWidth=".7" strokeDasharray="2,1.5" opacity=".4" />
          <path d="M17 12 L23 7" stroke="#5b8fd4" strokeWidth=".7" strokeDasharray="2,1.5" opacity=".4" />
        </svg>
        <div className="card-body">
          <div className="card-num">03 / 07</div>
          <div className="card-title">DATA PACKETS <span>(THE ENVELOPES)</span></div>
          <div className="card-text">Information broken into tiny labeled chunks, each routed independently through the network.</div>
          <div className="card-tag">LAYER 2 — TRANSPORT</div>
        </div>
      </div>

      <div className={`card cr ${activeStep === 3 ? 'active' : ''}`} onClick={() => handleCardClick(3)}>
        <svg className="card-icon" viewBox="0 0 34 34" fill="none">
          <path d="M3 19 Q9 11 17 19 Q25 27 31 19" stroke="#c97860" strokeWidth="1.1" fill="none" />
          <path d="M3 23 Q9 15 17 23 Q25 31 31 23" stroke="#c97860" strokeWidth=".5" fill="none" opacity=".3" />
          <circle cx="7" cy="19" r="2" fill="#c97860" opacity=".7" />
          <circle cx="17" cy="19" r="2" fill="#c97860" opacity=".7" />
          <circle cx="27" cy="19" r="2" fill="#c97860" opacity=".7" />
          <path d="M5 27 L5 25 M9 29 L9 26 M13 29 L13 27 M17 28 L17 26 M21 29 L21 26 M25 29 L25 26 M29 27 L29 25" stroke="#c97860" strokeWidth=".7" opacity=".25" />
          <ellipse cx="17" cy="28" rx="13" ry="3.5" fill="rgba(201,120,96,.04)" stroke="#c97860" strokeWidth=".4" opacity=".2" />
        </svg>
        <div className="card-body">
          <div className="card-num">04 / 07</div>
          <div className="card-title">SUBMARINE CABLES <span>(INFORMATION HIGHWAYS)</span></div>
          <div className="card-text">Undersea optical fibers spanning oceans, transmitting data at the speed of light.</div>
          <div className="card-tag">LAYER 3 — PHYSICAL</div>
        </div>
      </div>

      <div className={`card ca2 ${activeStep === 4 ? 'active' : ''}`} onClick={() => handleCardClick(4)}>
        <svg className="card-icon" viewBox="0 0 34 34" fill="none">
          <circle cx="17" cy="17" r="5.5" fill="rgba(245,200,66,.1)" stroke="#f5c842" strokeWidth=".9" />
          <circle cx="17" cy="17" r="2" fill="#f5c842" />
          <line x1="17" y1="3" x2="17" y2="11.5" stroke="#f5c842" strokeWidth=".9" strokeDasharray="2,1" opacity=".5" />
          <line x1="17" y1="22.5" x2="17" y2="31" stroke="#f5c842" strokeWidth=".9" strokeDasharray="2,1" opacity=".5" />
          <line x1="3" y1="17" x2="11.5" y2="17" stroke="#f5c842" strokeWidth=".9" strokeDasharray="2,1" opacity=".5" />
          <line x1="22.5" y1="17" x2="31" y2="17" stroke="#f5c842" strokeWidth=".9" strokeDasharray="2,1" opacity=".5" />
          <circle cx="17" cy="3" r="1.8" fill="#f5c842" opacity=".5" />
          <circle cx="17" cy="31" r="1.8" fill="#f5c842" opacity=".5" />
          <circle cx="3" cy="17" r="1.8" fill="#f5c842" opacity=".5" />
          <circle cx="31" cy="17" r="1.8" fill="#f5c842" opacity=".5" />
          <circle cx="17" cy="3" r=".8" fill="#0cb8a2" />
          <circle cx="31" cy="17" r=".8" fill="#0cb8a2" />
        </svg>
        <div className="card-body">
          <div className="card-num">05 / 07</div>
          <div className="card-title">ROUTERS <span>(THE DATA GPS)</span></div>
          <div className="card-text">Intelligent devices that analyze packet headers and choose the optimal path through the mesh.</div>
          <div className="card-tag">LAYER 4 — ROUTING</div>
        </div>
      </div>

      <div className={`card ct2 ${activeStep === 5 ? 'active' : ''}`} onClick={() => handleCardClick(5)}>
        <svg className="card-icon" viewBox="0 0 34 34" fill="none">
          <rect x="6" y="5" width="22" height="24" rx="1.5" fill="rgba(12,184,162,.08)" stroke="#0cb8a2" strokeWidth=".7" />
          <rect x="9" y="9" width="16" height="2" rx=".4" fill="#0cb8a2" opacity=".45" />
          <rect x="9" y="13" width="12" height="1.5" rx=".4" fill="#0cb8a2" opacity=".25" />
          <rect x="9" y="16" width="14" height="1.5" rx=".4" fill="#0cb8a2" opacity=".25" />
          <rect x="9" y="19" width="9" height="1.5" rx=".4" fill="#0cb8a2" opacity=".25" />
          <circle cx="24" cy="24" r="6" fill="var(--surface)" stroke="#0cb8a2" strokeWidth="1.1" />
          <path d="M21 24 L23 26 L27 21" stroke="#0cb8a2" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="card-body">
          <div className="card-num">06 / 07</div>
          <div className="card-title">REASSEMBLY <span>(THE MERGE)</span></div>
          <div className="card-text">All packets arrive and merge at the destination, reconstructing the original file or webpage.</div>
          <div className="card-tag">LAYER 6 — PRESENTATION</div>
        </div>
      </div>

      <div className={`card cs2 ${activeStep === 6 ? 'active' : ''}`} onClick={() => handleCardClick(6)}>
        <svg className="card-icon" viewBox="0 0 34 34" fill="none">
          <rect x="5" y="8" width="24" height="18" rx="1.5" fill="rgba(91,143,212,.08)" stroke="#5b8fd4" strokeWidth=".8" />
          <rect x="8" y="11" width="7" height="2" rx=".5" fill="#5b8fd4" opacity=".5" />
          <rect x="8" y="15" width="10" height="1.5" rx=".4" fill="#5b8fd4" opacity=".3" />
          <rect x="8" y="18" width="8" height="1.5" rx=".4" fill="#5b8fd4" opacity=".3" />
          <rect x="8" y="21" width="6" height="1.5" rx=".4" fill="#5b8fd4" opacity=".3" />
          <rect x="20" y="11" width="6" height="6" rx=".5" fill="rgba(232,160,32,.15)" stroke="#e8a020" strokeWidth=".6" />
          <circle cx="23" cy="14" r="1.5" fill="#e8a020" opacity=".7" />
          <rect x="20" y="19" width="6" height="3" rx=".5" fill="rgba(12,184,162,.15)" stroke="#0cb8a2" strokeWidth=".6" />
        </svg>
        <div className="card-body">
          <div className="card-num">07 / 07</div>
          <div className="card-title">YOUR BROWSER <span>(THE EXPERIENCE)</span></div>
          <div className="card-text">The application renders data into the webpage you see, making the internet human-readable.</div>
          <div className="card-tag">LAYER 7 — APPLICATION</div>
        </div>
      </div>

      <div className="osi-controls">
        <button className="osi-btn" onClick={handlePrev}>← prev</button>
        <button className="osi-btn" onClick={handlePausePlay}>
          {isPlaying ? 'pause' : 'play'}
        </button>
        <button className="osi-btn" onClick={handleNext}>next →</button>
      </div>
    </>
  );
}
