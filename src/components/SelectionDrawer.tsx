import { CITIES, CONNECTIONS } from '../data/network';
import SG from 'country-flag-icons/react/3x2/SG';
import JP from 'country-flag-icons/react/3x2/JP';
import GB from 'country-flag-icons/react/3x2/GB';
import US from 'country-flag-icons/react/3x2/US';
import AU from 'country-flag-icons/react/3x2/AU';
import IN from 'country-flag-icons/react/3x2/IN';
import AE from 'country-flag-icons/react/3x2/AE';
import DE from 'country-flag-icons/react/3x2/DE';
import FR from 'country-flag-icons/react/3x2/FR';
import BR from 'country-flag-icons/react/3x2/BR';
import CA from 'country-flag-icons/react/3x2/CA';
import './SelectionDrawer.css';

// Mapping country code to flag component
const FLAG_COMPONENTS: Record<string, React.FC<any>> = {
  SG, JP, GB, US, AU, IN, AE, DE, FR, BR, CA
};

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

    const FromFlag = FLAG_COMPONENTS[fromCity.countryCode];
    const ToFlag = FLAG_COMPONENTS[toCity.countryCode];

    return (
      <div className="selection-drawer state-c">
        <div className="drawer-header-row">
          <h3 className="drawer-header">
            <span className="drawer-route-flag">
              {FromFlag ? <FromFlag className="flag-icon" title={fromCity.name} /> : <span>{fromCity.flag}</span>}
              <span className="drawer-country-code">{fromCity.countryCode}</span>
            </span>
            {fromCity.name} →
            <span className="drawer-route-flag">
              {ToFlag ? <ToFlag className="flag-icon" title={toCity.name} /> : <span>{toCity.flag}</span>}
              <span className="drawer-country-code">{toCity.countryCode}</span>
            </span>
            {toCity.name}
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

  const CityFlag = FLAG_COMPONENTS[city.countryCode];

  return (
    <div className="selection-drawer state-b">
        <div className="drawer-header-row">
          <h3 className="drawer-header drawer-city-header">
            <span className="drawer-city-flag">
              {CityFlag ? <CityFlag className="flag-icon" title={city.name} /> : <span>{city.flag}</span>}
            </span>
            <span className="drawer-country-code">{city.countryCode}</span>
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
