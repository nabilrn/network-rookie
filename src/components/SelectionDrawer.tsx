import { CITIES, CONNECTIONS } from '../data/network';
import { ZoomIn } from 'lucide-react';
import type { Component360Type } from './Component360Viewer';
import './SelectionDrawer.css';

// Helper: flag image from flagcdn.com using ISO country code
const flagImg = (countryCode: string, size: 'sm' | 'md' = 'sm') => {
  const w = size === 'md' ? 36 : 24;
  const h = size === 'md' ? 27 : 18;
  return (
    <img
      src={`https://flagcdn.com/${w}x${h}/${countryCode.toLowerCase()}.png`}
      width={w}
      height={h}
      alt={countryCode}
      style={{ borderRadius: 2, verticalAlign: 'middle', boxShadow: '0 1px 3px rgba(0,0,0,.25)', display: 'inline-block' }}
    />
  );
};

interface SelectionDrawerProps {
  selectedCity: number | null;
  selectedArc: number | null;
  onBack?: () => void;
  onOpen360?: (scene: Component360Type) => void;
}

export function SelectionDrawer({ selectedCity, selectedArc, onBack, onOpen360 }: SelectionDrawerProps) {
  const city = selectedCity !== null ? CITIES[selectedCity] : null;
  const connection = selectedArc !== null ? CONNECTIONS[selectedArc] : null;
  const fromCity = connection
    ? CITIES.find(item => item.id === connection.from) ?? null
    : null;
  const toCity = connection
    ? CITIES.find(item => item.id === connection.to) ?? null
    : null;

  if (!city && !connection) {
    return (
      <div className="selection-drawer state-a">
        <div className="drawer-empty">
          <div className="drawer-empty-icon" aria-hidden="true">•</div>
          <div className="drawer-empty-text">
            Tap any city on the globe to start exploring
          </div>
        </div>
      </div>
    );
  }

  if (connection && fromCity && toCity) {
    const cableTypeLabel =
      connection.type === 'Subsea cable'
        ? 'Underwater cable'
        : 'Underground cable';
    const stepCards = [
      {
        title: 'You hit send',
        body: 'Your device breaks your message into tiny pieces',
      },
      {
        title: connection.type === 'Subsea cable' ? 'Under the ocean' : 'Underground',
        body: `Travels ${connection.distanceKm.toLocaleString()}km via ${connection.cable} cable`,
      },
      {
        title: 'Blazing fast',
        body: `Arrives in ${connection.latency}ms — ${connection.blinkComparison}`,
      },
      {
        title: 'Delivered!',
        body: 'Reassembled perfectly on the other side',
      },
    ];

    return (
      <div className="selection-drawer state-c">
        <div className="drawer-header-row">
          <h3 className="drawer-header">
            <span className="drawer-route-flag">
              {flagImg(fromCity.countryCode)}
              <span className="drawer-country-code">{fromCity.countryCode}</span>
            </span>
            {fromCity.name} →
            <span className="drawer-route-flag">
              {flagImg(toCity.countryCode)}
              <span className="drawer-country-code">{toCity.countryCode}</span>
            </span>
            {toCity.name}
          </h3>
          <button className="drawer-back" onClick={onBack}>
            Back
          </button>
        </div>

        <div className="drawer-cable-badge">{cableTypeLabel}</div>
        <button
          type="button"
          className="drawer-zoom-btn"
          onClick={() => onOpen360?.('fiber')}
        >
          <ZoomIn size={15} aria-hidden="true" />
          Zoom in 360 fiber optic
        </button>

        <div className="drawer-step-list">
          {stepCards.map((step, index) => (
            <div
              key={`${step.title}-${index}`}
              className="drawer-step-card"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <div className="drawer-step-title">{step.title}</div>
              <div className="drawer-step-body">{step.body}</div>
            </div>
          ))}
        </div>

        <div className="drawer-fun-fact">{connection.funFact}</div>
      </div>
    );
  }

  if (!city) {
    return null;
  }

  return (
    <div className="selection-drawer state-b">
        <div className="drawer-header-row">
          <h3 className="drawer-header drawer-city-header">
            {flagImg(city.countryCode, 'md')}
            <span className="drawer-country-code">{city.countryCode}</span>
            <span>{city.name}</span>
          </h3>
        <button className="drawer-back" onClick={onBack}>
          Back
        </button>
      </div>

      <div className="drawer-tier-badge">
        {city.hubTier === 1 ? 'Major internet hub' : 'Regional hub'}
      </div>
      <button
        type="button"
        className="drawer-zoom-btn"
        onClick={() => onOpen360?.('data-center')}
      >
        <ZoomIn size={15} aria-hidden="true" />
        Zoom in 360 data center
      </button>

      <blockquote className="drawer-friendly-quote">
        “{city.friendlyFact}”
      </blockquote>
      <div className="drawer-hero-stat">{city.heroStat}</div>

      <hr className="drawer-divider" />
      <div className="drawer-cta">Tap another city to continue the route</div>
    </div>
  );
}
