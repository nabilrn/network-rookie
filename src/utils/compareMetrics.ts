/**
 * Comparison utilities for before/after analysis
 * Calculates metrics impact for different simulation modes
 */

import { CONNECTIONS, getConnectionById } from '../data/network';

export interface CompareMetrics {
  mode: 'normal' | 'high-load' | 'packet-loss' | 'cable-cut';
  before: {
    latency: number;
    latencyLabel: string;
    distance: number;
    retryRate: number;
    stability: 'excellent' | 'good' | 'fair' | 'poor';
  };
  after: {
    latency: number;
    latencyLabel: string;
    distance: number;
    retryRate: number;
    stability: 'excellent' | 'good' | 'fair' | 'poor';
  };
  delta: {
    latencyDelta: number; // ms increase
    distanceDelta: number; // km increase
    retryDelta: number; // % increase
    stabilityDelta: string; // text description
  };
}

/**
 * Friendly latency label from milliseconds
 */
function latencyLabel(ms: number): string {
  if (ms < 50) return 'Ultra-fast ⚡';
  if (ms < 100) return 'Very fast 🚀';
  if (ms < 150) return 'Fast ✓';
  if (ms < 200) return 'Normal';
  if (ms < 300) return 'Sluggish 🐢';
  return 'Very slow 🐌';
}

/**
 * Stability level based on congestion score
 */
function stabilityFromCongestion(congestionScore: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (congestionScore < 30) return 'excellent';
  if (congestionScore < 60) return 'good';
  if (congestionScore < 80) return 'fair';
  return 'poor';
}

/**
 * Calculate metrics for a connection in a given mode
 */
export function calculateConnectionMetrics(
  connectionId: string,
  mode: 'normal' | 'high-load' | 'packet-loss' | 'cable-cut',
): CompareMetrics | null {
  const conn = getConnectionById(connectionId);
  if (!conn) return null;

  // Normal mode baseline
  const baseLatency = conn.latency;
  const baseDistance = conn.distanceKm;
  const baseRetryRate = 0; // 0% in normal mode
  const baseStability = stabilityFromCongestion(conn.congestionScore);

  let afterLatency = baseLatency;
  let afterDistance = baseDistance;
  let afterRetryRate = baseRetryRate;
  let afterStability = baseStability;

  // Apply mode-specific degradation
  if (mode === 'high-load') {
    // High load: latency increases 20-40%, retries stay low
    afterLatency = baseLatency * (1.2 + conn.congestionScore / 250);
    afterRetryRate = conn.congestionScore / 50; // 0-2% based on congestion
    afterStability = conn.congestionScore > 70 ? 'fair' : 'good';
  } else if (mode === 'packet-loss') {
    // Packet loss: latency increases due to retries, retry rate 5-15%
    afterLatency = baseLatency * 1.15; // 15% overhead from retries
    afterRetryRate = 5 + Math.random() * 10; // 5-15%
    afterStability = 'fair';
  } else if (mode === 'cable-cut') {
    // Cable cut: use backup route if available
    if (conn.backupRouteIds.length > 0) {
      const backupConn = getConnectionById(conn.backupRouteIds[0]);
      if (backupConn) {
        // Reroute adds ~30% latency + ~20% distance
        afterLatency = backupConn.latency * 1.3;
        afterDistance = backupConn.distanceKm * 1.2;
        afterRetryRate = 2; // Small retry overhead
        afterStability = 'good';
      }
    } else {
      // No backup: severe degradation
      afterLatency = baseLatency * 2.5;
      afterDistance = baseDistance * 1.8;
      afterRetryRate = 25;
      afterStability = 'poor';
    }
  }

  return {
    mode,
    before: {
      latency: baseLatency,
      latencyLabel: latencyLabel(baseLatency),
      distance: baseDistance,
      retryRate: baseRetryRate,
      stability: baseStability,
    },
    after: {
      latency: Math.round(afterLatency),
      latencyLabel: latencyLabel(Math.round(afterLatency)),
      distance: Math.round(afterDistance),
      retryRate: Math.round(afterRetryRate * 10) / 10,
      stability: afterStability,
    },
    delta: {
      latencyDelta: Math.round(afterLatency - baseLatency),
      distanceDelta: Math.round(afterDistance - baseDistance),
      retryDelta: Math.round((afterRetryRate - baseRetryRate) * 10) / 10,
      stabilityDelta:
        afterStability === baseStability
          ? 'Same'
          : `${baseStability} → ${afterStability}`,
    },
  };
}

/**
 * Average metrics across all connections
 */
export function calculateAggregateMetrics(
  mode: 'normal' | 'high-load' | 'packet-loss' | 'cable-cut',
): CompareMetrics {
  let totalBeforeLatency = 0;
  let totalAfterLatency = 0;
  let totalBeforeDistance = 0;
  let totalAfterDistance = 0;
  let totalAfterRetry = 0;
  let poorStabilityCount = 0;

  for (const conn of CONNECTIONS) {
    totalBeforeLatency += conn.latency;
    totalBeforeDistance += conn.distanceKm;

    const metrics = calculateConnectionMetrics(conn.id, mode);
    if (metrics) {
      totalAfterLatency += metrics.after.latency;
      totalAfterDistance += metrics.after.distance;
      totalAfterRetry += metrics.after.retryRate;
      if (metrics.after.stability === 'poor') poorStabilityCount++;
    }
  }

  const count = CONNECTIONS.length;
  const avgBeforeLatency = Math.round(totalBeforeLatency / count);
  const avgAfterLatency = Math.round(totalAfterLatency / count);
  const avgBeforeDistance = Math.round(totalBeforeDistance / count);
  const avgAfterDistance = Math.round(totalAfterDistance / count);
  const avgAfterRetry = Math.round((totalAfterRetry / count) * 10) / 10;

  const afterStability =
    poorStabilityCount > count * 0.3 ? 'poor' : poorStabilityCount > 0 ? 'fair' : 'good';

  return {
    mode,
    before: {
      latency: avgBeforeLatency,
      latencyLabel: latencyLabel(avgBeforeLatency),
      distance: avgBeforeDistance,
      retryRate: 0,
      stability: 'excellent',
    },
    after: {
      latency: avgAfterLatency,
      latencyLabel: latencyLabel(avgAfterLatency),
      distance: avgAfterDistance,
      retryRate: avgAfterRetry,
      stability: afterStability,
    },
    delta: {
      latencyDelta: avgAfterLatency - avgBeforeLatency,
      distanceDelta: avgAfterDistance - avgBeforeDistance,
      retryDelta: avgAfterRetry,
      stabilityDelta:
        afterStability === 'excellent' ? 'Unchanged' : `Degraded to ${afterStability}`,
    },
  };
}
