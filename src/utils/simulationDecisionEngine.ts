/**
 * Decision simulation engine for network impact analysis.
 * Calculates mode-specific consequences of user decisions.
 */

import { CONNECTIONS } from '../data/network';

export interface DecisionOption {
  id: string;
  label: string;
  description: string; // plain English brief
  emoji: string;
}

export interface DecisionConsequence {
  affectedRoutes: string[]; // connection IDs that improve/degrade
  impactType: 'positive' | 'negative' | 'mixed';
  summary: string; // 1-2 sentence impact summary
  tradeoff: string; // what's given up
  userExperience: string; // plain English impact on end user
  highlightCities?: string[]; // optional: city IDs to visually highlight
}

export interface Decision {
  id: string;
  mode: 'high-load' | 'packet-loss' | 'cable-cut';
  question: string;
  options: DecisionOption[];
  recommended: string; // option id
  why: string;
}

export interface DecisionResult extends Decision {
  selectedOption: string;
  consequence: DecisionConsequence;
  nextStep: string; // what happens next
}

export interface DecisionVisualImpact {
  mode: 'high-load' | 'packet-loss' | 'cable-cut';
  selectedOptionId: string;
  selectedOptionLabel: string;
  consequence: DecisionConsequence;
  appliedAt: number;
}

/**
 * Get decision set for a given mode
 */
export function getDecisionForMode(mode: 'high-load' | 'packet-loss' | 'cable-cut'): Decision {
  const decisions: Record<string, Decision> = {
    'high-load': {
      id: 'rush-hour-priority',
      mode: 'high-load',
      question: 'During rush hour, millions of people are streaming video. Your network has limited capacity. What do you prioritize?',
      options: [
        {
          id: 'video-priority',
          label: '🎬 Prioritize Video',
          description: 'Give video streams maximum bandwidth and low latency',
          emoji: '🎬',
        },
        {
          id: 'fair-distribution',
          label: '⚖️ Fair Distribution',
          description: 'Divide bandwidth equally among all services',
          emoji: '⚖️',
        },
      ],
      recommended: 'fair-distribution',
      why: 'Fair distribution prevents one service from starving others and provides more resilient overall experience.',
    },
    'packet-loss': {
      id: 'packet-loss-strategy',
      mode: 'packet-loss',
      question: 'Packets are getting lost due to noisy cables. Should you aggressively retry lost data or reduce quality to avoid overload?',
      options: [
        {
          id: 'retry-aggressive',
          label: '🔄 Retry Aggressively',
          description: 'Resend lost packets multiple times until they arrive',
          emoji: '🔄',
        },
        {
          id: 'reduce-quality',
          label: '📉 Reduce Quality',
          description: 'Accept some data loss; send lower quality streams',
          emoji: '📉',
        },
      ],
      recommended: 'reduce-quality',
      why: 'Aggressive retries can cause congestion. Graceful degradation (lower quality) is faster and less disruptive.',
    },
    'cable-cut': {
      id: 'cable-cut-routing',
      mode: 'cable-cut',
      question: 'A submarine cable has been cut by a ship anchor. Data must reroute. Choose the path:',
      options: [
        {
          id: 'shortest-path',
          label: '⚡ Shortest Path',
          description: 'Reroute via the geographically shortest alternative route',
          emoji: '⚡',
        },
        {
          id: 'most-stable',
          label: '🛡️ Most Stable',
          description: 'Use routes with better redundancy and fewer recent incidents',
          emoji: '🛡️',
        },
      ],
      recommended: 'most-stable',
      why: 'Stable routes have more backup options. If another route fails, traffic can still flow.',
    },
  };

  return decisions[mode] || decisions['high-load'];
}

/**
 * Calculate consequences for a specific decision choice
 */
export function calculateConsequence(
  mode: 'high-load' | 'packet-loss' | 'cable-cut',
  selectedOptionId: string
): DecisionConsequence {
  // Map decisions to affected routes and impacts
  const consequences: Record<string, Record<string, DecisionConsequence>> = {
    'high-load': {
      'video-priority': {
        affectedRoutes: ['tok-sgp-jupiter', 'nyc-lon-aec1', 'lon-fra-terrestrial', 'lax-tok-faster'],
        impactType: 'mixed',
        summary:
          'Video services get fast, smooth playback. But email, messaging, and web browsing slow down significantly due to less available bandwidth.',
        tradeoff: 'Video quality stays high, but users experience slower email and web access.',
        userExperience:
          'Netflix and YouTube work great. Checking email or loading web pages takes 3-5x longer than normal. Video calls get priority over everything else.',
        highlightCities: ['tok', 'lon', 'lax'],
      },
      'fair-distribution': {
        affectedRoutes: CONNECTIONS.map((c) => c.id),
        impactType: 'positive',
        summary: 'All services share bandwidth equally. Nothing is super fast, but everything works reasonably well.',
        tradeoff: 'Video may buffer occasionally, but web and email remain responsive.',
        userExperience:
          'Video streams at good (not ultra-high) quality. Web pages load normally. Video calls are stable. Everything feels balanced.',
        highlightCities: undefined,
      },
    },
    'packet-loss': {
      'retry-aggressive': {
        affectedRoutes: ['syd-sgp-indigo', 'syd-lax-sc', 'lax-sgp-sea-us'],
        impactType: 'negative',
        summary:
          'Retrying lost packets causes network congestion. Latency increases even more, and new packets get lost trying to reach the already-full cables.',
        tradeoff: 'You send more data, which makes congestion worse. Network becomes slower overall.',
        userExperience:
          'Audio calls sound choppy at first, then cut out. File downloads stall. Everything becomes painfully slow as network backs up.',
        highlightCities: ['syd', 'lax'],
      },
      'reduce-quality': {
        affectedRoutes: ['syd-sgp-indigo', 'syd-lax-sc', 'lax-sgp-sea-us'],
        impactType: 'positive',
        summary:
          'Sending smaller, lower-quality streams uses less bandwidth. Lost packets matter less because each one carries less crucial data. Service recovers quickly.',
        tradeoff: 'Video is slightly blurry, images take a moment to load. But everything works and feels responsive.',
        userExperience:
          'Video calls work with slightly lower quality—noticeable but not terrible. Files download reliably, just at lower speed. System feels stable.',
        highlightCities: undefined,
      },
    },
    'cable-cut': {
      'shortest-path': {
        affectedRoutes: ['mum-dxb-smew5', 'dxb-lon-flag', 'dxb-fra-smw5'],
        impactType: 'negative',
        summary:
          'Shortest reroute avoids extra distance but sends traffic through congested hubs. Those hubs get overwhelmed. Data backs up.',
        tradeoff: 'Latency stays moderate at first but spikes unpredictably as backup routes fill up. Can cause cascading failures.',
        userExperience:
          'Connections to Asia/Middle East work at first but become unreliable within minutes. You might lose connection entirely if another route fails.',
        highlightCities: ['dxb', 'tok'],
      },
      'most-stable': {
        affectedRoutes: ['sgp-mum-smew4', 'lon-fra-terrestrial', 'nyc-lon-aec1'],
        impactType: 'positive',
        summary:
          'Stable routes have more backups. Traffic is spread across multiple links. If one fails, others pick up the load.',
        tradeoff:
          'Route is slightly longer (10-15% higher latency). But the connection remains reliable even under stress.',
        userExperience:
          'Latency goes up a little (noticeable but acceptable). Video calls work fine, files download reliably, and the connection stays stable for hours.',
        highlightCities: ['lon', 'fra'],
      },
    },
  };

  return consequences[mode]?.[selectedOptionId] || {
    affectedRoutes: [],
    impactType: 'mixed',
    summary: 'Impact unknown.',
    tradeoff: 'Unknown tradeoff.',
    userExperience: 'Unable to calculate experience.',
  };
}

/**
 * Generate AI-friendly consequence narration
 */
export function narrateConsequence(consequence: DecisionConsequence, selectedLabel: string): string {
  return `Decision: ${selectedLabel}
What happens: ${consequence.summary}
Tradeoff: ${consequence.tradeoff}
User impact: ${consequence.userExperience}`;
}
