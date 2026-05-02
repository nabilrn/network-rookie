import { CITIES, CONNECTIONS } from '../data/network';
import './SelectionDrawer.css';

interface SelectionDrawerProps {
  selectedCity: number | null;
  selectedArc: number | null;
  onBack?: () => void;
}

export function SelectionDrawer({ selectedCity, selectedArc, onBack }: SelectionDrawerProps) {
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
          <div className="drawer-empty-icon" aria-hidden="true">👆</div>
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
        ? '🌊 Underwater cable'
        : '🌍 Underground cable';
    const routeIcon = connection.type === 'Subsea cable' ? '🌊' : '🌍';
    const stepCards = [
      {
        emoji: '📱',
        title: 'You hit send',
        body: 'Your device breaks your message into tiny pieces',
      },
      {
        emoji: routeIcon,
        title: connection.type === 'Subsea cable' ? 'Under the ocean' : 'Underground',
        body: `Travels ${connection.distanceKm.toLocaleString()}km via ${connection.cable} cable`,
      },
      {
        emoji: '⚡',
        title: 'Blazing fast',
        body: `Arrives in ${connection.latency}ms — ${connection.blinkComparison}`,
      },
      {
        emoji: '📬',
        title: 'Delivered!',
        body: 'Reassembled perfectly on the other side',
      },
    ];

    return (
      <div className="selection-drawer state-c">
        <div className="drawer-header-row">
          <h3 className="drawer-header">
            {fromCity.flag} {fromCity.name} → {toCity.flag} {toCity.name}
          </h3>
          <button className="drawer-back" onClick={onBack}>
            ← back
          </button>
        </div>

        <div className="drawer-cable-badge">{cableTypeLabel}</div>

        <div className="drawer-step-list">
          {stepCards.map((step, index) => (
            <div
              key={`${step.title}-${index}`}
              className="drawer-step-card"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <div className="drawer-step-title">{step.emoji} {step.title}</div>
              <div className="drawer-step-body">{step.body}</div>
            </div>
          ))}
        </div>

        <div className="drawer-fun-fact">💡 {connection.funFact}</div>
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
          <span className="drawer-city-flag">{city.flag}</span>
          <span>{city.name}</span>
        </h3>
        <button className="drawer-back" onClick={onBack}>
          ← back
        </button>
      </div>

      <div className="drawer-tier-badge">
        {city.hubTier === 1 ? 'Major Internet Hub 🌐' : 'Regional Hub'}
      </div>

      <blockquote className="drawer-friendly-quote">
        “{city.friendlyFact}”
      </blockquote>
      <div className="drawer-hero-stat">{city.heroStat}</div>

      <hr className="drawer-divider" />
      <div className="drawer-cta">Now tap another city to send a message there →</div>
    </div>
  );
}
