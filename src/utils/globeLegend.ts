import type { DecisionVisualImpact } from './simulationDecisionEngine';

type LegendTone =
  | 'neutral'
  | 'warn'
  | 'danger'
  | 'success'
  | 'info'
  | 'arc-amber'
  | 'arc-teal'
  | 'arc-blue'
  | 'packet'
  | 'hub'
  | 'fiber'
  | 'infra'
  | 'sat';

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
    items.push({ id: 'route-amber', symbol: '━━', text: 'Amber arcs group major transoceanic backbone corridors.', tone: 'arc-amber' });
    items.push({ id: 'route-teal', symbol: '━━', text: 'Teal arcs group Asia-Europe and inter-region corridors.', tone: 'arc-teal' });
    items.push({ id: 'route-blue', symbol: '━━', text: 'Blue arcs group general regional backbone paths.', tone: 'arc-blue' });
    items.push({ id: 'subsea-cable', symbol: '━', text: 'Gold paths indicate long intercontinental fiber links.', tone: 'fiber' });
    items.push({ id: 'data-packets', symbol: '• •', text: 'Cyan moving dots simulate small pieces of data in transit.', tone: 'packet' });
    items.push({ id: 'hub-ring', symbol: '◉', text: 'Pulsing cyan rings mark major internet hubs.', tone: 'hub' });
    items.push({ id: 'company-logo', symbol: '■', text: 'White logo tiles mark nearby cloud and data-center operators.', tone: 'infra' });
    items.push({ id: 'satellite-leo', symbol: 'SAT', text: 'Starlink markers represent low-earth-orbit satellite gateways.', tone: 'sat' });
  } else if (mode === 'high-load') {
    items.push({ id: 'route-high-load', symbol: '━━', text: 'Amber sampled routes show busy traffic corridors.', tone: 'warn' });
    items.push({ id: 'high-load-dots', symbol: '• •', text: 'Extra amber/cyan dots show more data entering selected routes.', tone: 'packet' });
  } else if (mode === 'packet-loss') {
    items.push({ id: 'route-packet-loss', symbol: '↺', text: 'Red retry marker means a small piece of data had to be sent again.', tone: 'danger' });
  } else if (mode === 'cable-cut') {
    items.push({ id: 'route-cable-cut', symbol: '✕ ✕', text: 'Two red X marks block data approaching the broken cable segment.', tone: 'danger' });
  }

  // Common item for focus (only in simulation modes or when hovering/selecting)
  if (mode !== 'normal') {
     items.push({ id: 'focus-ring', symbol: '◉', text: 'Pulsing cyan ring shows the city or hub in focus.', tone: 'hub' });
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
