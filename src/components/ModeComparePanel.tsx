import React, { useMemo } from 'react';
import { calculateAggregateMetrics } from '../utils/compareMetrics';
import './ModeComparePanel.css';

interface ModeComparePanelProps {
  mode: 'normal' | 'high-load' | 'packet-loss' | 'cable-cut';
  isVisible: boolean;
}

export const ModeComparePanel: React.FC<ModeComparePanelProps> = ({ mode, isVisible }) => {
  const metrics = useMemo(() => calculateAggregateMetrics(mode), [mode]);

  if (!isVisible) return null;

  const latencyChangePercent = Math.round(
    ((metrics.after.latency - metrics.before.latency) / metrics.before.latency) * 100,
  );

  const distanceChangePercent = Math.round(
    ((metrics.after.distance - metrics.before.distance) / metrics.before.distance) * 100,
  );

  const isNormalMode = mode === 'normal';
  const hasSignificantImpact = Math.abs(latencyChangePercent) > 5;
  const latencyTrend = latencyChangePercent > 0 ? '+' : latencyChangePercent < 0 ? '-' : '±';
  const distanceTrend = distanceChangePercent > 0 ? '+' : distanceChangePercent < 0 ? '-' : '±';

  return (
    <div className="mode-compare-panel" data-mode={mode}>
      <div className="compare-header">
        <span className="compare-title">Normal vs current mode</span>
        <span className="compare-badge" data-significant={hasSignificantImpact && !isNormalMode}>
          {isNormalMode ? 'Baseline' : 'Impact'}
        </span>
      </div>

      <div className="compare-metrics">
        {/* Latency Card */}
        <div className="metric-card">
          <div className="metric-label">Latency</div>
          <div className="metric-row">
            <div className="metric-value-pair">
              <span className="value-label">Normal:</span>
              <span className="value-number">{metrics.before.latency}ms</span>
              <span className="value-subtext">{metrics.before.latencyLabel}</span>
            </div>
            <div className="metric-arrow">→</div>
            <div className="metric-value-pair">
              <span className="value-label">{mode === 'normal' ? 'Current:' : 'During:'}</span>
              <span className="value-number" data-impact={latencyChangePercent > 0}>
                {metrics.after.latency}ms
              </span>
              <span className="value-subtext">{metrics.after.latencyLabel}</span>
            </div>
          </div>
          {!isNormalMode && (
            <div className="metric-delta">
              {latencyTrend}{Math.abs(latencyChangePercent)}% change
              ({metrics.delta.latencyDelta > 0 ? '+' : ''}{metrics.delta.latencyDelta}ms)
            </div>
          )}
        </div>

        {/* Distance Card */}
        <div className="metric-card">
          <div className="metric-label">Route distance</div>
          <div className="metric-row">
            <div className="metric-value-pair">
              <span className="value-label">Normal:</span>
              <span className="value-number">{metrics.before.distance}km</span>
            </div>
            <div className="metric-arrow">→</div>
            <div className="metric-value-pair">
              <span className="value-label">During:</span>
              <span className="value-number" data-impact={distanceChangePercent > 0}>
                {metrics.after.distance}km
              </span>
            </div>
          </div>
          {!isNormalMode && (
            <div className="metric-delta">
              {distanceTrend}{Math.abs(distanceChangePercent)}% change
              ({metrics.delta.distanceDelta > 0 ? '+' : ''}{metrics.delta.distanceDelta}km)
            </div>
          )}
        </div>

        {/* Retry/Stability Card */}
        <div className="metric-card">
          <div className="metric-label">Data retries and stability</div>
          <div className="metric-row">
            <div className="metric-value-pair">
              <span className="value-label">Normal:</span>
              <span className="value-subtext">
                {metrics.before.retryRate}% retries
                <br />
                Stability: {metrics.before.stability}
              </span>
            </div>
            <div className="metric-arrow">→</div>
            <div className="metric-value-pair">
              <span className="value-label">During:</span>
              <span
                className="value-subtext"
                data-stability={metrics.after.stability}
              >
                {metrics.after.retryRate}% retries
                <br />
                Stability: {metrics.after.stability}
              </span>
            </div>
          </div>
          {!isNormalMode && (
            <div className="metric-delta">
              {metrics.delta.retryDelta > 0 ? '+' : ''}{metrics.delta.retryDelta}% retry overhead
              | {metrics.delta.stabilityDelta}
            </div>
          )}
        </div>
      </div>

      {!isNormalMode && hasSignificantImpact && (
        <div className="compare-insight">
          <span className="insight-emoji" aria-hidden="true">i</span>
          <span className="insight-text">
            {mode === 'high-load'
              ? 'During peak traffic, expect slower speeds as routes become congested.'
              : mode === 'packet-loss'
                ? 'With weak signals or interference, your data may need to be resent, causing delays.'
                : mode === 'cable-cut'
                  ? 'When a cable breaks, traffic reroutes through longer paths, significantly increasing latency.'
                  : 'See how different network conditions affect your experience.'}
          </span>
        </div>
      )}
    </div>
  );
};
