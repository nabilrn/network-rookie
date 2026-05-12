import { useEffect, useState } from 'react';
import { STATE } from './GlobeSection';
import './HUD.css';

interface SparkBar {
  h: number;
  delay: number;
  duration: number;
  opacity: number;
}

interface AnimatedValue {
  current: number | string;
  previous: number | string;
  key: number;
}

export function HUD() {
  const [streamCount, setStreamCount] = useState<AnimatedValue>({
    current: 12847203,
    previous: 12847203,
    key: 0,
  });
  const [activeRoutes, setActiveRoutes] = useState<AnimatedValue>({
    current: 16,
    previous: 16,
    key: 0,
  });
  const [latency, setLatency] = useState<AnimatedValue>({
    current: '18ms',
    previous: '18ms',
    key: 0,
  });
  const [sparkBars, setSparkBars] = useState<SparkBar[]>([]);
  const [, setForceUpdate] = useState(0);

  // Generate sparkline bars on mount
  useEffect(() => {
    const heights = [55, 72, 40, 85, 62, 90, 48, 78, 55, 68, 82, 45, 70, 60, 88, 52, 74, 66, 80, 58];
    const bars = heights.map((h, i) => {
      const delay = i * 0.12;
      const duration = 2.2 + (i % 3) * 0.6;
      const opacity = 0.2 + h / 280;
      return { h, delay, duration, opacity };
    });
    setSparkBars(bars);
  }, []);

  // Packet stream counter - ticks up randomly every 800ms
  useEffect(() => {
    const interval = setInterval(() => {
      setStreamCount(prev => {
        const increment = Math.floor(Math.random() * 2400) + 300;
        const newValue = (prev.current as number) + increment;
        return {
          current: newValue,
          previous: prev.current,
          key: prev.key + 1,
        };
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Active routes - fluctuate between 14-18
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveRoutes(prev => {
        const newValue = 14 + Math.floor(Math.random() * 5); // 14-18
        return {
          current: newValue,
          previous: prev.current,
          key: prev.key + 1,
        };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Poll for STATE changes to update latency
  useEffect(() => {
    const interval = setInterval(() => {
      setForceUpdate(n => n + 1);

      let newLatency = '18ms';
      if (STATE.simulationMode === 'high-load') {
        newLatency = '340ms';
      } else if (STATE.simulationMode === 'packet-loss') {
        newLatency = '95ms';
      } else if (STATE.simulationMode === 'cable-cut') {
        newLatency = '∞';
      }

      setLatency(prev => {
        if (prev.current !== newLatency) {
          return {
            current: newLatency,
            previous: prev.current,
            key: prev.key + 1,
          };
        }
        return prev;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hud">
      <div className="hud-stats">
        <div className="stat-row">
            <div className="s-dot a"></div>
            <span className="s-label">Live traffic</span>
          <span className="s-val a animated-value">
            <span key={`prev-${streamCount.key}`} className="value-exit">
              {typeof streamCount.previous === 'number' ? streamCount.previous.toLocaleString() : streamCount.previous}
            </span>
            <span key={`curr-${streamCount.key}`} className="value-enter">
              {typeof streamCount.current === 'number' ? streamCount.current.toLocaleString() : streamCount.current}
            </span>
          </span>
        </div>
        <div className="stat-row">
            <div className="s-dot t"></div>
            <span className="s-label">Active routes</span>
          <span className="s-val t animated-value">
            <span key={`prev-${activeRoutes.key}`} className="value-exit">
              {activeRoutes.previous}
            </span>
            <span key={`curr-${activeRoutes.key}`} className="value-enter">
              {activeRoutes.current}
            </span>
          </span>
        </div>
        <div className="stat-row">
            <div className="s-dot s"></div>
            <span className="s-label">Current latency</span>
          <span className="s-val s animated-value">
            <span key={`prev-${latency.key}`} className="value-exit">
              {latency.previous}
            </span>
            <span key={`curr-${latency.key}`} className="value-enter">
              {latency.current}
            </span>
          </span>
        </div>
      </div>

      <div className="hud-mini">
        <div className="mini-card">
          <div>Throughput / 30s</div>
          <div className="mini-sparkline">
            {sparkBars.map((bar, i) => (
              <div
                key={i}
                className="spark-bar"
                style={{
                  height: `${bar.h}%`,
                  animationDelay: `${bar.delay}s`,
                  animationDuration: `${bar.duration}s`,
                  opacity: bar.opacity,
                }}
              ></div>
            ))}
          </div>
        </div>
        <div className="mini-card">
          <div>Retry rate</div>
          <div className="val">0.003%</div>
        </div>
      </div>
    </div>
  );
}
