import type { DecisionVisualImpact } from './simulationDecisionEngine';

type LegendTone = 'neutral' | 'warn' | 'danger' | 'success' | 'info';

export interface GlobeLegendItem {
  id: string;
  symbol: string;
  text: string;
  tone: LegendTone;
}

function normalizeMode(mode: string | null): 'normal' | 'high-load' | 'packet-loss' | 'cable-cut' {
  if (mode === 'high-load' || mode === 'packet-loss' || mode === 'cable-cut') {
    return mode;
  }
  return 'normal';
}

export function getDecisionMarker(
  mode: DecisionVisualImpact['mode'],
  selectedOptionId: string,
): string {
  if (mode === 'high-load') return selectedOptionId === 'video-priority' ? 'H+' : 'BAL';
  if (mode === 'packet-loss') return selectedOptionId === 'retry-aggressive' ? 'R!' : 'Q-';
  return selectedOptionId === 'shortest-path' ? 'FST' : 'STB';
}

export function getDecisionMarkerMeaning(
  mode: DecisionVisualImpact['mode'],
  selectedOptionId: string,
): string {
  if (mode === 'high-load') {
    return selectedOptionId === 'video-priority'
      ? 'Video is getting first priority on busy routes.'
      : 'Traffic is being balanced so all apps share capacity.';
  }
  if (mode === 'packet-loss') {
    return selectedOptionId === 'retry-aggressive'
      ? 'The network keeps retrying dropped small data pieces.'
      : 'The network lowers quality so traffic stays stable.';
  }
  return selectedOptionId === 'shortest-path'
    ? 'Traffic takes the fastest backup route.'
    : 'Traffic takes the most stable backup route.';
}

export function getGlobeLegendItems(
  simulationMode: string | null,
  decisionImpact: DecisionVisualImpact | null,
): GlobeLegendItem[] {
  const mode = normalizeMode(simulationMode);
  const activeDecision = decisionImpact && decisionImpact.mode === mode ? decisionImpact : null;

  const items: GlobeLegendItem[] = [];

  if (mode === 'normal') {
    items.push({ id: 'route-normal', symbol: '━━', text: 'Colored arcs represent network backbone routes.', tone: 'neutral' });
    items.push({ id: 'subsea-cable', symbol: '━', text: 'Thick yellow lines show intercontinental subsea fiber.', tone: 'warn' });
    items.push({ id: 'data-packets', symbol: '• •', text: 'Moving dots simulate real-time data packets traversing the network.', tone: 'info' });
    items.push({ id: 'hub-ring', symbol: '◉', text: 'Pulsing blue rings mark major internet hubs.', tone: 'info' });
    items.push({ id: 'company-logo', symbol: '🏢', text: 'Logos highlight Big Tech data centers and cloud regions.', tone: 'neutral' });
    items.push({ id: 'satellite-leo', symbol: 'SAT', text: 'SpaceX Starlink satellites in Low Earth Orbit (LEO).', tone: 'info' });
  } else if (mode === 'high-load') {
    items.push({ id: 'route-high-load', symbol: '━━', text: 'Thicker routes mean traffic is getting busier.', tone: 'warn' });
    items.push({ id: 'high-load-dots', symbol: '• •', text: 'More moving dots mean more traffic entering a route.', tone: 'warn' });
  } else if (mode === 'packet-loss') {
    items.push({ id: 'route-packet-loss', symbol: '↺', text: 'Retry marker means a small piece of data had to be sent again.', tone: 'danger' });
  } else if (mode === 'cable-cut') {
    items.push({ id: 'route-cable-cut', symbol: '✕', text: 'X marks a route that is currently disrupted.', tone: 'danger' });
  }

  // Common item for focus (only in simulation modes or when hovering/selecting)
  if (mode !== 'normal') {
     items.push({ id: 'focus-ring', symbol: '◉', text: 'Pulsing ring shows the city or hub in focus.', tone: 'info' });
  }

  if (activeDecision) {
    const marker = getDecisionMarker(activeDecision.mode, activeDecision.selectedOptionId);
    items.push({
      id: 'decision-choice',
      symbol: marker,
      text: getDecisionMarkerMeaning(activeDecision.mode, activeDecision.selectedOptionId),
      tone:
        activeDecision.consequence.impactType === 'positive'
          ? 'success'
          : activeDecision.consequence.impactType === 'negative'
            ? 'danger'
            : 'warn',
    });
    items.push({
      id: 'decision-impact',
      symbol: '+ / !',
      text: 'City marker: + is improving, ! is under stress.',
      tone: 'info',
    });
  }

  return items;
}
