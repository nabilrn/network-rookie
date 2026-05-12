import React from 'react';
import { Mission } from '../hooks/useAppState';
import { CITIES } from '../data/network';
import './MissionCard.css';

interface MissionCardProps {
  mission: Mission;
  onStart: () => void;
  onComplete: () => void;
  onReset: () => void;
}

export const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  onStart,
  onComplete,
  onReset,
}) => {
  const fromCity = CITIES.find(c => c.id === mission.fromId);
  const toCity = CITIES.find(c => c.id === mission.toId);

  const fromCode = fromCity?.countryCode || '';
  const toCode = toCity?.countryCode || '';
  const fromName = fromCity?.name || mission.fromId;
  const toName = toCity?.name || mission.toId;

  const flagImg = (countryCode: string) =>
    countryCode ? (
      <img
        className="route-flag-img"
        src={`https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`}
        width={24}
        height={18}
        alt={countryCode}
      />
    ) : <span className="route-fallback">NET</span>;

  const statusLabel = {
    inactive: 'Not started',
    active: 'In progress',
    success: 'Completed',
    failed: 'Failed',
  }[mission.status];

  return (
    <div className="mission-card" data-status={mission.status}>
      <div className="mission-header">
        <div className="mission-title-section">
          <h3 className="mission-title">{mission.title}</h3>
          <span className="mission-status" data-status={mission.status}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="mission-goal">
        <p>{mission.goal}</p>
      </div>

      <div className="mission-route">
        <div className="route-point">
          <span className="route-flag">{flagImg(fromCode)}</span>
          <span className="route-name">{fromName}</span>
        </div>
        <div className="route-arrow">→</div>
        <div className="route-point">
          <span className="route-flag">{flagImg(toCode)}</span>
          <span className="route-name">{toName}</span>
        </div>
      </div>

      <div className="mission-actions">
        {mission.status === 'inactive' && (
          <button className="mission-btn btn-primary" onClick={onStart}>
            Start mission
          </button>
        )}
        {mission.status === 'active' && (
          <>
            <button className="mission-btn btn-success" onClick={onComplete}>
              Complete mission
            </button>
            <button className="mission-btn btn-secondary" onClick={onReset}>
              Reset
            </button>
          </>
        )}
        {(mission.status === 'success' || mission.status === 'failed') && (
          <button className="mission-btn btn-secondary" onClick={onReset}>
            {mission.status === 'success' ? 'Next Mission' : 'Try Again'}
          </button>
        )}
      </div>
    </div>
  );
};
