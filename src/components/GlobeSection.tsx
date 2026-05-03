import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Globe from 'globe.gl';
import * as topojson from 'topojson-client';
import { CITIES, CONNS, CONNECTIONS, ARC_COLORS } from '../data/network';
import type { DecisionVisualImpact } from '../utils/simulationDecisionEngine';
import { getDecisionMarker, getGlobeLegendItems } from '../utils/globeLegend';
import { HUD } from './HUD';
import { PacketDots } from './PacketDots';
import './GlobeSection.css';

interface GlobeSectionProps {
  theme: 'dark' | 'light';
  selectedCity: number | null;
  selectedArc: number | null;
  simulationMode: string | null;
  decisionImpact: DecisionVisualImpact | null;
  onResetAll?: () => void;
  onCitySelect: (index: number | null) => void;
  onArcSelect: (index: number | null) => void;
  onModeChange: (mode: string) => void;
}

export interface GlobeSectionRef {
  globeRef: React.RefObject<any>;
  triggerJourney: (fromId: string, toId: string) => void;
  triggerReset: () => void;
}

// ═══════════════════════════════════════════════════════════
// SHARED STATE
// ═══════════════════════════════════════════════════════════
export const STATE = {
  selectedCity: null as number | null,
  selectedArc: null as number | null,
  simulationMode: 'normal' as string,
  osiStep: null as number | null,
  decisionImpact: null as DecisionVisualImpact | null,
};

// Helper: render a flag <img> from ISO country code (works on Chromium/Windows)
const flagImgUrl = (countryCode: string) =>
  `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;

// Helper: convert hex color to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const CITY_DIALOG_GAP = 18;
const CITY_DIALOG_EDGE_PADDING = 16;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

type CityDialogPosition = {
  left: number;
  top: number;
  side: 'left' | 'right';
};

// Theme-specific colors for the globe
const getGlobeColors = (theme: 'dark' | 'light') => {
  if (theme === 'light') {
    return {
      atmosphere: '#93c5fd',
      surface: '#bfdbfe',
      specular: '#dbeafe',
      emissive: '#f0f9ff',
      emissiveIntensity: 0.2,
      countryCap: '#60a5fa',
      countrySide: 'rgba(147, 197, 253, 0.2)',
      countryStroke: 'rgba(37, 99, 235, 0.65)', // Darker blue for visibility
    };
  }

  return {
    atmosphere: '#1a3060',
    surface: '#050810',
    specular: '#001128',
    emissive: '#000408',
    emissiveIntensity: 0.4,
    countryCap: '#0d1c36',
    countrySide: 'rgba(20, 70, 140, 0.12)',
    countryStroke: 'rgba(50, 120, 200, 0.42)',
  };
};

const getArcColors = (theme: 'dark' | 'light'): Record<string, string> => {
  if (theme === 'light') {
    return {
      amber: '#b45309',
      teal: '#0f766e',
      steel: '#1d4ed8',
    };
  }

  return ARC_COLORS;
};

export const GlobeSection = forwardRef<GlobeSectionRef, GlobeSectionProps>(
  ({ theme, selectedCity, selectedArc, simulationMode, decisionImpact, onResetAll, onCitySelect, onArcSelect, onModeChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const currentThemeRef = useRef<'dark' | 'light'>(theme);
  const arcsDataRef = useRef<any[]>([]);
  const cityDialogRef = useRef<HTMLDivElement>(null);
  const [hintVisible, setHintVisible] = useState(true);
  const [cityDialogPosition, setCityDialogPosition] = useState<CityDialogPosition>({
    left: 40,
    top: 40,
    side: 'right',
  });

  // Sync props to STATE and trigger globe zoom
  useEffect(() => {
    if (!globeRef.current) return;

    const newMode = simulationMode || 'normal';
    const modeChanged = STATE.simulationMode !== newMode;
      
    // Update local state copy
    STATE.selectedCity = selectedCity;
    STATE.selectedArc = selectedArc;
    STATE.simulationMode = newMode;
    STATE.decisionImpact = decisionImpact;

    const globe = globeRef.current;
    const controls = globe.controls ? globe.controls() : null;

    // Zoom IN close to city + stop rotation
    if (selectedCity !== null) {
      const city = CITIES[selectedCity];
      if (controls) controls.autoRotate = false;
      
      // Tighter city zoom while keeping a bit of route context.
      globe.pointOfView(
        { lat: city.lat, lng: city.lng, altitude: 0.55 },
        1500
      );
      setHintVisible(false);
    }
    // Zoom OUT when simulation mode changes (dramatic overview effect)
    else if (modeChanged) {
      if (controls) controls.autoRotate = false;
      globe.pointOfView({ lat: 14, lng: 0, altitude: 1.58 }, 1000);
      
      // Resume rotation after zoom-out animation
      setTimeout(() => {
        if (globeRef.current?.controls) {
          const currentControls = globeRef.current.controls();
          if (currentControls && STATE.selectedCity === null) {
            currentControls.autoRotate = true;
          }
        }
      }, 1400);
      setHintVisible(false);
    }
    // Reset state — resume rotation
    else if (selectedCity === null && selectedArc === null) {
      if (controls) controls.autoRotate = true;
    }

    // Always trigger a render to update visuals (colors, radius, etc.)
    render();
  }, [selectedCity, selectedArc, simulationMode, decisionImpact, theme]);

  // Update theme ref
  useEffect(() => {
    currentThemeRef.current = theme;
  }, [theme]);

  function triggerJourney(fromId: string, toId: string) {
    const fromIdx = CITIES.findIndex(city => city.id === fromId);
    const toIdx = CITIES.findIndex(city => city.id === toId);

    const arcIdx = CONNECTIONS.findIndex(
      conn =>
        (conn.from === fromId && conn.to === toId) ||
        (conn.from === toId && conn.to === fromId),
    );

    STATE.selectedCity = null;
    STATE.selectedArc = arcIdx >= 0 ? arcIdx : null;
    onCitySelect(null);
    onArcSelect(STATE.selectedArc);

    if (globeRef.current && fromIdx >= 0 && toIdx >= 0) {
      const fromCity = CITIES[fromIdx];
      const toCity = CITIES[toIdx];
      globeRef.current.pointOfView(
        {
          lat: (fromCity.lat + toCity.lat) / 2,
          lng: (fromCity.lng + toCity.lng) / 2,
          altitude: 2.2,
        },
        1200,
      );
    }

    render();
  }

  function triggerReset() {
    STATE.selectedCity = null;
    STATE.selectedArc = null;
    onCitySelect(null);
    onArcSelect(null);

    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
    }

    render();
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER FUNCTION — Updates globe based on STATE
  // ═══════════════════════════════════════════════════════════
  const render = () => {
    if (!globeRef.current) return;

    const globe = globeRef.current;
    const isLightTheme = currentThemeRef.current === 'light';
    const isPacketLossMode = STATE.simulationMode === 'packet-loss';
    const isCableCutMode = STATE.simulationMode === 'cable-cut';
    const activeDecisionImpact =
      STATE.decisionImpact && STATE.decisionImpact.mode === STATE.simulationMode
        ? STATE.decisionImpact
        : null;
    const affectedArcIndices = new Set<number>();
    const highlightedCityIds = new Set(activeDecisionImpact?.consequence.highlightCities ?? []);
    const dimmedArcOpacity = isLightTheme ? 0.35 : 0.15;
    const decisionAccentColor = activeDecisionImpact
      ? activeDecisionImpact.consequence.impactType === 'positive'
        ? '#22c55e'
        : activeDecisionImpact.consequence.impactType === 'negative'
          ? '#ef4444'
          : '#f59e0b'
      : null;
    const flickerMinOpacity = isLightTheme ? 0.55 : 0.3;
    const flickerRange = isLightTheme ? 0.45 : 0.7;
    const accentColor = currentThemeRef.current === 'light' ? '#ea8c0d' : '#e8a020';
    const ringColor = currentThemeRef.current === 'light'
      ? 'rgba(234, 140, 13, 0.5)'
      : 'rgba(232, 160, 32, 0.5)';

    // Helper: check if arc is connected to selected city
    const isArcConnectedToCity = (arcIndex: number, cityIndex: number): boolean => {
      const conn = CONNS[arcIndex];
      if (!conn) return false;
      const [startIdx, endIdx] = conn;
      return startIdx === cityIndex || endIdx === cityIndex;
    };

    const isConnectionMatch = (routeKey: string, conn: (typeof CONNECTIONS)[number]): boolean => {
      return (
        routeKey === conn.id ||
        routeKey === `${conn.from}-${conn.to}` ||
        routeKey === `${conn.to}-${conn.from}`
      );
    };

    if (activeDecisionImpact) {
      CONNECTIONS.forEach((conn, index) => {
        if (activeDecisionImpact.consequence.affectedRoutes.some((routeKey) => isConnectionMatch(routeKey, conn))) {
          affectedArcIndices.add(index);
          highlightedCityIds.add(conn.from);
          highlightedCityIds.add(conn.to);
        }
      });
    }

    // Update point radius based on selection
    globe.pointRadius((d: any, i: number) => {
      const city = CITIES[i];
      if (city && highlightedCityIds.has(city.id)) return 0.92;
      return STATE.selectedCity === i ? 1.0 : 0.65;
    });

    // Update point color with glowing effect for selected
    globe.pointColor((d: any, i: number) => {
      const city = CITIES[i];
      if (city && highlightedCityIds.has(city.id) && activeDecisionImpact) {
        if (activeDecisionImpact.consequence.impactType === 'positive') {
          return '#22c55e';
        }
        if (activeDecisionImpact.consequence.impactType === 'negative') {
          return '#ef4444';
        }
        return '#f59e0b';
      }
      return STATE.selectedCity === i ? accentColor : '#e8a020';
    });

    // Update arc stroke width — thicker for selected, AND vary by congestion in high-load mode
    globe.arcStroke((d: any, i: number) => {
      let baseStroke = isLightTheme ? 0.72 : 0.5;
      
      // In high-load mode, vary thickness based on congestion
      if (STATE.simulationMode === 'high-load') {
        const conn = CONNECTIONS[i];
        if (conn) {
          // congestionScore 0-100 → thickness multiplier 0.8-1.8
          const congestionFactor = 0.8 + (conn.congestionScore / 100) * 1.0;
          baseStroke = baseStroke * congestionFactor;
        }
      }
      
      if (STATE.selectedArc === i) return baseStroke + 0.4; // Add 0.4 for selected
      if (activeDecisionImpact && affectedArcIndices.has(i)) return baseStroke + 0.72;
      return baseStroke;
    });

    const dashLength = activeDecisionImpact
      ? activeDecisionImpact.mode === 'cable-cut'
        ? 0.08
        : activeDecisionImpact.mode === 'packet-loss'
          ? 0.14
          : 0.28
      : isCableCutMode
        ? 0.12
        : isPacketLossMode
          ? 0.18
          : 0.25;
    const dashGap = activeDecisionImpact
      ? activeDecisionImpact.mode === 'high-load'
        ? 0.45
        : 1.2
      : isCableCutMode
        ? 1.2
        : isPacketLossMode
          ? 1.0
          : 0.75;
    const dashAnimateBase = activeDecisionImpact
      ? activeDecisionImpact.mode === 'packet-loss'
        ? 620
        : activeDecisionImpact.mode === 'high-load'
          ? 820
          : 980
      : isPacketLossMode
        ? 950
        : isCableCutMode
          ? 1500
          : STATE.simulationMode === 'high-load'
            ? 1300
            : 1800;
    const dashAnimateJitter = isPacketLossMode ? 550 : 1200;

    globe
      .arcDashLength(dashLength)
      .arcDashGap(dashGap)
      .arcDashAnimateTime(() => dashAnimateBase + Math.random() * dashAnimateJitter);

    // Update arc color with opacity based on selection state AND simulation mode
    globe.arcColor((d: any, i: number) => {
      let baseColor = d.color;
      let useFlickerOpacity = false;

      // Override base color based on simulation mode
      if (STATE.simulationMode === 'high-load') {
        baseColor = isLightTheme ? '#b45309' : '#e8a020'; // All amber in high load
      } else if (isPacketLossMode) {
        baseColor = isLightTheme ? '#b91c1c' : '#c97860'; // All rose in packet loss
        useFlickerOpacity = true;
      } else if (isCableCutMode) {
        // Cable cut: all routes turn muted steel, selected route turns red
        baseColor = isLightTheme ? '#64748b' : '#94a3b8';
        if (STATE.selectedArc === i) {
          baseColor = '#ef4444'; // Red for cut cable
        }
      }

      // If an arc is selected, dim all others to 15%
      if (STATE.selectedArc !== null) {
        if (STATE.selectedArc === i) {
          return baseColor; // Full opacity for selected arc
        }
        return hexToRgba(baseColor, dimmedArcOpacity);
      }

      if (activeDecisionImpact) {
        if (affectedArcIndices.has(i)) {
          if (activeDecisionImpact.mode === 'packet-loss') {
            if (activeDecisionImpact.consequence.impactType === 'negative') {
              const pulseOpacity = 0.5 + Math.random() * 0.5;
              return hexToRgba('#ef4444', pulseOpacity);
            }
            return '#22c55e';
          }

          if (activeDecisionImpact.mode === 'cable-cut') {
            return activeDecisionImpact.consequence.impactType === 'negative' ? '#ef4444' : '#38bdf8';
          }

          return activeDecisionImpact.consequence.impactType === 'negative' ? '#ef4444' : '#f59e0b';
        }
        return hexToRgba(baseColor, isLightTheme ? 0.08 : 0.03);
      }

      // If a city is selected, dim arcs not connected to it
      if (STATE.selectedCity !== null) {
        if (isArcConnectedToCity(i, STATE.selectedCity)) {
          // In packet loss mode, add flickering via varying opacity
          if (useFlickerOpacity) {
            const flickerOpacity = flickerMinOpacity + Math.random() * flickerRange;
            return hexToRgba(baseColor, flickerOpacity);
          }
          return baseColor; // Full opacity for connected arcs
        }
        return hexToRgba(baseColor, dimmedArcOpacity);
      }

      // Nothing selected
      if (useFlickerOpacity) {
        // Flickering opacity for packet loss mode
        const flickerOpacity = flickerMinOpacity + Math.random() * flickerRange;
        return hexToRgba(baseColor, flickerOpacity);
      }

      return baseColor;
    });

    // Update rings data — show glowing ring for selected city
    const ringsData =
      STATE.selectedCity !== null
        ? [CITIES[STATE.selectedCity]]
        : CITIES.filter((city) => highlightedCityIds.has(city.id));

    globe
      .ringsData(ringsData)
      .ringColor(() => decisionAccentColor ? hexToRgba(decisionAccentColor, 0.6) : ringColor)
      .ringMaxRadius(activeDecisionImpact ? 3.4 : 2)
      .ringPropagationSpeed(activeDecisionImpact ? 3 : 2)
      .ringRepeatPeriod(activeDecisionImpact ? 900 : 1500);

    // Packet loss mode: trigger periodic re-render for flickering effect
    if (STATE.simulationMode === 'packet-loss') {
      // Flickering handled by random opacity in arcColor above
      // Could add periodic re-render here if needed for animation
    }

    // Cable cut mode: add labels/markers for selected arc
    const labelsData: Array<{ lat: number; lng: number; text: string; color: string; size: number }> = [];

    if (activeDecisionImpact && affectedArcIndices.size > 0) {
      const decisionMarkerText = getDecisionMarker(
        activeDecisionImpact.mode,
        activeDecisionImpact.selectedOptionId,
      );
      const decisionMarkerColor =
        activeDecisionImpact.consequence.impactType === 'positive'
          ? '#22c55e'
          : activeDecisionImpact.consequence.impactType === 'negative'
            ? '#ef4444'
            : '#f59e0b';

      Array.from(affectedArcIndices).slice(0, 6).forEach((arcIndex) => {
        const arc = arcsDataRef.current[arcIndex];
        if (!arc) return;
        labelsData.push({
          lat: (arc.startLat + arc.endLat) / 2,
          lng: (arc.startLng + arc.endLng) / 2,
          text: decisionMarkerText,
          color: decisionMarkerColor,
          size: 1.75,
        });
      });

      const highlightedCities = CITIES.filter((city) => highlightedCityIds.has(city.id)).slice(0, 8);
      highlightedCities.forEach((city) => {
        labelsData.push({
          lat: city.lat,
          lng: city.lng,
          text: activeDecisionImpact.consequence.impactType === 'negative' ? '!' : '+',
          color: decisionMarkerColor,
          size: 1.4,
        });
      });
    } else if (activeDecisionImpact && highlightedCityIds.size > 0) {
      CITIES.filter((city) => highlightedCityIds.has(city.id)).forEach((city) => {
        labelsData.push({
          lat: city.lat,
          lng: city.lng,
          text: activeDecisionImpact.consequence.impactType === 'negative' ? '!' : '+',
          color: activeDecisionImpact.consequence.impactType === 'negative' ? '#ef4444' : '#22c55e',
          size: 1.5,
        });
      });
    } else if (isPacketLossMode && arcsDataRef.current.length > 0) {
      const step = Math.max(1, Math.floor(arcsDataRef.current.length / 5));
      for (let i = 0; i < arcsDataRef.current.length && labelsData.length < 5; i += step) {
        const arc = arcsDataRef.current[i];
        labelsData.push({
          lat: (arc.startLat + arc.endLat) / 2,
          lng: (arc.startLng + arc.endLng) / 2,
          text: '↺',
          color: isLightTheme ? '#b45309' : '#f59e0b',
          size: 1.05,
        });
      }
    }

    if (isCableCutMode && arcsDataRef.current.length > 0) {
      if (STATE.selectedArc !== null) {
        const cutArc = arcsDataRef.current[STATE.selectedArc];
        const conn = CONNECTIONS[STATE.selectedArc];
        
        labelsData.push(
          {
            lat: (cutArc.startLat + cutArc.endLat) / 2,
            lng: (cutArc.startLng + cutArc.endLng) / 2,
            text: '✕',
            color: '#ef4444',
            size: 1.6,
          },
          {
            lat: cutArc.startLat,
            lng: cutArc.startLng,
            text: '⚠',
            color: '#ef4444',
            size: 1.0,
          },
          {
            lat: cutArc.endLat,
            lng: cutArc.endLng,
            text: '⚠',
            color: '#ef4444',
            size: 1.0,
          },
        );
        
        // Add backup route indicator when alternatives exist
        if (conn && conn.backupRouteIds.length > 0) {
          labelsData.push({
            lat: (cutArc.startLat + cutArc.endLat) / 2 + 0.5,
            lng: (cutArc.startLng + cutArc.endLng) / 2,
            text: '🔄 Rerouting',
            color: '#22c55e',
            size: 0.85,
          });
        }
      } else {
        labelsData.push({
          lat: 14,
          lng: 0,
          text: '⚠',
          color: '#ef4444',
          size: 1.25,
        });
      }
    }

    globe
      .labelsData(labelsData)
      .labelLat('lat')
      .labelLng('lng')
      .labelText('text')
      .labelSize('size')
      .labelColor('color')
      .labelDotRadius(activeDecisionImpact ? 0.65 : 0.3)
      .labelAltitude(activeDecisionImpact ? 0.06 : 0.01);

    console.log('🎯 Render — City:', STATE.selectedCity, '| Arc:', STATE.selectedArc, '| Mode:', STATE.simulationMode);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const colors = getGlobeColors(theme);
    const arcColors = getArcColors(theme);

    const arcsData = CONNS.map(([i, j, col]) => ({
      startLat: CITIES[i].lat,
      startLng: CITIES[i].lng,
      endLat: CITIES[j].lat,
      endLng: CITIES[j].lng,
      color: arcColors[col],
    }));

    // Store arcsData in ref for render function access
    arcsDataRef.current = arcsData;

    const W = containerRef.current.clientWidth;
    const H = containerRef.current.clientHeight;

    const globe = Globe({ animateIn: false })(containerRef.current)
      .width(W)
      .height(H)
      .backgroundColor('rgba(0,0,0,0)')
      .atmosphereColor(colors.atmosphere)
      .atmosphereAltitude(0.18)
      // Points / cities
      .pointsData(CITIES)
      .pointLat('lat')
      .pointLng('lng')
      .pointColor((d: any, i: number) => {
        return STATE.selectedCity === i
          ? (theme === 'light' ? '#ea8c0d' : '#e8a020')
          : '#e8a020';
      })
      .pointAltitude(0.012)
      .pointRadius((d: any, i: number) => {
        return STATE.selectedCity === i ? 1.0 : 0.65;
      })
      .onPointClick((point: any, event: any, { lat, lng, altitude }: any) => {
        const clickedIndex = CITIES.findIndex(city =>
          city.lat === point.lat && city.lng === point.lng
        );

        if (clickedIndex !== -1) {
          if (hintVisible) {
            setHintVisible(false);
          }

          STATE.selectedCity = STATE.selectedCity === clickedIndex ? null : clickedIndex;
          STATE.selectedArc = null;
          onArcSelect(null);
          onCitySelect(STATE.selectedCity);
          console.log('🖱️ City clicked:', CITIES[clickedIndex].name, '| Index:', clickedIndex);

          // TODO: SERVICE - Fetch real city metadata (latency, protocol, connection type)
          // API endpoint: GET /api/cities/${clickedIndex}/metadata
          // Response: { latency: number, protocol: string, type: string }

          render();
        }
      })
      .pointLabel((d: any) => {
        const tooltipBg = theme === 'light' ? 'rgba(255,255,255,.95)' : 'rgba(9,8,13,.95)';
        const tooltipBorder = theme === 'light' ? 'rgba(234,140,13,.4)' : 'rgba(232,160,32,.3)';
        const tooltipText = theme === 'light' ? '#ea8c0d' : '#e8a020';
        const tooltipMuted = theme === 'light' ? '#64748b' : '#364050';
        const countryCode = typeof d.countryCode === 'string' ? d.countryCode : '';
        const flagSrc = countryCode ? flagImgUrl(countryCode) : '';
        const flagHtml = flagSrc
          ? `<img src="${flagSrc}" width="24" height="18" style="border-radius:2px;vertical-align:middle;box-shadow:0 1px 3px rgba(0,0,0,.25);" alt="${countryCode}" />`
          : '🌐';

        return `
          <div style="font-family:Inter,system-ui,sans-serif;font-size:13px;
            background:${tooltipBg};border:1px solid ${tooltipBorder};
            padding:8px 12px;border-radius:6px;color:${tooltipText};
            max-width:240px;white-space:normal;line-height:1.5;">
            <div style="font-size:16px;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              ${flagHtml}
              <span style="font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:1px 6px;border-radius:999px;border:1px solid ${tooltipBorder};background:color-mix(in srgb, ${tooltipText} 12%, transparent);">${countryCode}</span>
              <span>${d.name}</span>
            </div>
            <div style="color:${tooltipMuted};font-size:11px;line-height:1.45;">${d.friendlyFact}</div>
          </div>
        `;
      })
      // Arcs / streams
      .arcsData(arcsData)
      .arcStartLat('startLat')
      .arcStartLng('startLng')
      .arcEndLat('endLat')
      .arcEndLng('endLng')
      .arcColor('color')
      .arcAltitude(0.28)
      .arcStroke(0.5)
      .arcDashLength(0.25)
      .arcDashGap(0.75)
      .arcDashAnimateTime(() => 1800 + Math.random() * 1200)
      .arcsTransitionDuration(0)
      .onArcClick((arc: any, event: any, { lat, lng, altitude }: any) => {
        // Find the index of the clicked arc in CONNS array
        const clickedIndex = arcsData.findIndex(a =>
          a.startLat === arc.startLat &&
          a.startLng === arc.startLng &&
          a.endLat === arc.endLat &&
          a.endLng === arc.endLng
        );

        if (clickedIndex !== -1) {
          STATE.selectedArc = STATE.selectedArc === clickedIndex ? null : clickedIndex;
          STATE.selectedCity = null; // Deselect city when arc is selected
          onArcSelect(STATE.selectedArc);
          onCitySelect(null);
          console.log('🖱️ Arc clicked:', CONNS[clickedIndex], '| Index:', clickedIndex);

          // TODO: SERVICE - Fetch real arc/route metadata
          // API endpoint: GET /api/routes/${clickedIndex}/metadata
          // Response: { latency: number, protocol: string, bandwidth: string, status: string }

          render();
        }
      })
      // Rings / selection glow
      .ringsData([])
      .ringLat('lat')
      .ringLng('lng')
      .ringColor(() => theme === 'light' ? 'rgba(234, 140, 13, 0.5)' : 'rgba(232, 160, 32, 0.5)')
      .ringMaxRadius(2)
      .ringPropagationSpeed(2)
      .ringRepeatPeriod(1500)
      // Labels (for cable-cut markers)
      .labelsData([])
      .labelLat('lat')
      .labelLng('lng')
      .labelText('text')
      .labelSize('size')
      .labelColor('color')
      .labelDotRadius(0.3)
      .labelAltitude(0.01)
      // Countries
      .polygonsData([])
      .polygonCapColor(() => colors.countryCap)
      .polygonSideColor(() => colors.countrySide)
      .polygonStrokeColor(() => colors.countryStroke)
      .polygonAltitude(0.004)
      // City name labels on globe
      .htmlElementsData(CITIES)
      .htmlLat((d: any) => d.lat)
      .htmlLng((d: any) => d.lng)
      .htmlAltitude(0.015)
      .htmlElement((d: any) => {
        const el = document.createElement('div');
        el.style.cssText = `
          font-family: 'Space Grotesk', Inter, system-ui, sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: ${theme === 'light' ? '#1e40af' : '#93c5fd'};
          text-shadow: ${theme === 'light'
            ? '0 0 4px rgba(255,255,255,0.9), 0 1px 2px rgba(0,0,0,0.15)'
            : '0 0 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)'};
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          transform: translate(-50%, -100%);
          padding-bottom: 6px;
          letter-spacing: 0.04em;
        `;
        el.textContent = d.name;
        return el;
      });

    // Style the globe surface
    globe.globeMaterial().color.set(colors.surface);
    globe.globeMaterial().specular.set(colors.specular);
    globe.globeMaterial().shininess = 12;
    globe.globeMaterial().emissive.set(colors.emissive);
    globe.globeMaterial().emissiveIntensity = colors.emissiveIntensity;

    // Auto-rotate
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.35;
    globe.controls().enableDamping = true;
    globe.controls().dampingFactor = 0.08;

    // Background click — reset all selections
    globe.onGlobeClick(() => {
      if (STATE.selectedCity !== null || STATE.selectedArc !== null) {
        STATE.selectedCity = null;
        STATE.selectedArc = null;
        onCitySelect(null);
        onArcSelect(null);
        console.log('🌍 Background clicked — Reset all selections');
        render();
      }
    });

    globeRef.current = globe;

    // Load country polygons
    fetch('https://unpkg.com/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(world => {
        const countries = topojson.feature(world, world.objects.countries);
        globe.polygonsData((countries as any).features);
      })
      .catch(() => {
        console.log('Country data unavailable; globe still functional.');
      });

    // Resize handler
    const handleResize = () => {
      if (containerRef.current && globeRef.current) {
        globeRef.current
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeRef.current) {
        globeRef.current._destructor?.();
      }
    };
  }, [theme]);

  // Update globe colors when theme changes
  useEffect(() => {
    if (!globeRef.current) return;

    const colors = getGlobeColors(theme);
    const globe = globeRef.current;

    // Update atmosphere
    globe.atmosphereColor(colors.atmosphere);

    // Update globe material
    globe.globeMaterial().color.set(colors.surface);
    globe.globeMaterial().specular.set(colors.specular);
    globe.globeMaterial().emissive.set(colors.emissive);
    globe.globeMaterial().emissiveIntensity = colors.emissiveIntensity;

    // Update country colors
    globe
      .polygonCapColor(() => colors.countryCap)
      .polygonSideColor(() => colors.countrySide)
      .polygonStrokeColor(() => colors.countryStroke);

    // Re-render selection with new theme colors
    render();
  }, [theme]);

  useEffect(() => {
    if (!globeRef.current || !decisionImpact || decisionImpact.mode !== simulationMode) return;

    const impactedCityIds = new Set<string>(decisionImpact.consequence.highlightCities ?? []);
    let firstImpactedConnection: (typeof CONNECTIONS)[number] | null = null;
    decisionImpact.consequence.affectedRoutes.forEach((routeKey) => {
      const conn = CONNECTIONS.find(
        (item) =>
          item.id === routeKey ||
          `${item.from}-${item.to}` === routeKey ||
          `${item.to}-${item.from}` === routeKey,
      );
      if (conn) {
        if (!firstImpactedConnection) firstImpactedConnection = conn;
        impactedCityIds.add(conn.from);
        impactedCityIds.add(conn.to);
      }
    });

    const impactedCities = CITIES.filter((city) => impactedCityIds.has(city.id));
    if (impactedCities.length === 0) return;

    const avgLat = impactedCities.reduce((sum, city) => sum + city.lat, 0) / impactedCities.length;
    const avgLng = impactedCities.reduce((sum, city) => sum + city.lng, 0) / impactedCities.length;
    const captured = firstImpactedConnection;
    const fromCity = captured
      ? CITIES.find((c) => c.id === captured.from)
      : null;
    const toCity = captured
      ? CITIES.find((c) => c.id === captured.to)
      : null;
    const focusLat = fromCity && toCity ? (fromCity.lat + toCity.lat) / 2 : avgLat;
    const focusLng = fromCity && toCity ? (fromCity.lng + toCity.lng) / 2 : avgLng;

    const controls = globeRef.current.controls?.();
    if (controls) controls.autoRotate = false;
    globeRef.current.pointOfView({ lat: focusLat, lng: focusLng, altitude: 1.7 }, 900);

    render();
  }, [decisionImpact, simulationMode]);

  useEffect(() => {
    const shouldPulse =
      simulationMode === 'packet-loss' ||
      (decisionImpact?.mode === 'packet-loss' && simulationMode === 'packet-loss');

    if (!shouldPulse) return;

    const intervalId = window.setInterval(() => {
      render();
    }, 180);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [simulationMode, decisionImpact, theme, selectedCity, selectedArc]);

  const updateCityDialogPosition = () => {
    if (selectedCity === null) return;
    if (!containerRef.current || !globeRef.current) return;

    const city = CITIES[selectedCity];
    const screen = globeRef.current.getScreenCoords?.(city.lat, city.lng, 0.015);
    if (!screen) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const dialogWidth = cityDialogRef.current?.offsetWidth ?? 320;
    const dialogHeight = cityDialogRef.current?.offsetHeight ?? 360;

    const hasSpaceOnRight =
      screen.x + CITY_DIALOG_GAP + dialogWidth + CITY_DIALOG_EDGE_PADDING <=
      containerWidth;
    const hasSpaceOnLeft =
      screen.x - CITY_DIALOG_GAP - dialogWidth - CITY_DIALOG_EDGE_PADDING >= 0;
    const side: 'left' | 'right' =
      hasSpaceOnRight || !hasSpaceOnLeft ? 'right' : 'left';

    const rawLeft =
      side === 'right'
        ? screen.x + CITY_DIALOG_GAP
        : screen.x - dialogWidth - CITY_DIALOG_GAP;
    const rawTop = screen.y - dialogHeight / 2;

    const nextLeft = Math.round(
      clamp(
        rawLeft,
        CITY_DIALOG_EDGE_PADDING,
        containerWidth - dialogWidth - CITY_DIALOG_EDGE_PADDING,
      ),
    );
    const nextTop = Math.round(
      clamp(
        rawTop,
        CITY_DIALOG_EDGE_PADDING,
        containerHeight - dialogHeight - CITY_DIALOG_EDGE_PADDING,
      ),
    );

    setCityDialogPosition(prev => {
      if (
        prev.left === nextLeft &&
        prev.top === nextTop &&
        prev.side === side
      ) {
        return prev;
      }
      return { left: nextLeft, top: nextTop, side };
    });
  };

  useEffect(() => {
    if (selectedCity === null) return;

    let frame = 0;
    const tick = () => {
      updateCityDialogPosition();
      frame = requestAnimationFrame(tick);
    };

    tick();
    const onResize = () => updateCityDialogPosition();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [selectedCity]);

  useImperativeHandle(ref, () => ({
    globeRef,
    triggerJourney,
    triggerReset,
  }));

  // Get selected city data for overlay
  const selectedCityData = selectedCity !== null ? CITIES[selectedCity] : null;
  const decisionBadge = decisionImpact && decisionImpact.mode === simulationMode
    ? {
        tone:
          decisionImpact.consequence.impactType === 'positive'
            ? 'success'
            : decisionImpact.consequence.impactType === 'negative'
              ? 'danger'
              : 'warn',
        title: `Decision Active: ${decisionImpact.selectedOptionLabel}`,
        detail: `Highlighting ${decisionImpact.consequence.affectedRoutes.length} affected routes and key hubs.`,
      }
    : null;
  const simulationBadge =
    simulationMode === 'packet-loss'
      ? {
          tone: 'loss',
          title: '📶 Packet Loss',
          detail: 'Dropped data pieces are being re-sent. Look for unstable routes and retry markers.',
        }
      : simulationMode === 'cable-cut'
        ? {
            tone: 'danger',
            title: '✂️ Cable Break',
            detail:
              selectedArc !== null
                ? 'A route is cut. Red X and warning markers show the disrupted link and endpoints.'
                : 'Tap any route to simulate a cable cut. All routes are muted to highlight outage mode.',
          }
        : simulationMode === 'high-load'
          ? {
              tone: 'warn',
              title: '🚦 Rush Hour',
              detail: 'Traffic demand is high. Watch routes become denser and busier across hubs.',
            }
          : null;
  const legendItems = getGlobeLegendItems(simulationMode, decisionImpact);

  const closeCityDialog = () => {
    STATE.selectedCity = null;
    STATE.selectedArc = null;
    onCitySelect(null);
    onArcSelect(null);

    const controls = globeRef.current?.controls?.();
    if (controls) {
      controls.autoRotate = true;
    }

    render();
  };

  const handleResetAll = () => {
    setHintVisible(true);
    onResetAll?.();
  };

  return (
    <div className="globe-section">
      <div ref={containerRef} className="globe-container"></div>
      <button className="globe-reset-all-btn" onClick={handleResetAll}>
        ↺ Reset All
      </button>
      <PacketDots globeRef={globeRef} theme={theme} />
      <HUD />
      {hintVisible && (
        <div className="globe-hint">
          👆 Tap any city to begin
        </div>
      )}
      {simulationBadge && (
        <div className={`globe-sim-badge globe-sim-badge--${simulationBadge.tone}`}>
          <div className="globe-sim-badge-title">{simulationBadge.title}</div>
          <div className="globe-sim-badge-detail">{simulationBadge.detail}</div>
        </div>
      )}
      {decisionBadge && (
        <div className={`globe-decision-badge globe-decision-badge--${decisionBadge.tone}`}>
          <div className="globe-sim-badge-title">{decisionBadge.title}</div>
          <div className="globe-sim-badge-detail">{decisionBadge.detail}</div>
        </div>
      )}
      <div className="globe-legend">
        <div className="globe-legend-title">🗺️ Globe legend</div>
        <div className="globe-legend-list">
          {legendItems.map((item) => (
            <div key={item.id} className="globe-legend-item">
              <span className={`globe-legend-symbol globe-legend-symbol--${item.tone}`}>
                {item.symbol}
              </span>
              <span className="globe-legend-text">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* City Info Dialog */}
      {selectedCityData && (
        <div
          ref={cityDialogRef}
          className={`city-dialog city-dialog--${cityDialogPosition.side}`}
          style={{ left: `${cityDialogPosition.left}px`, top: `${cityDialogPosition.top}px` }}
          key={selectedCity}
        >
          <div className="city-dialog-flag-row">
            <div className="city-dialog-flag">
              <img
                src={flagImgUrl(selectedCityData.countryCode)}
                width={36}
                height={27}
                alt={selectedCityData.countryCode}
                style={{ borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,.3)', display: 'block' }}
              />
            </div>
            <div className="city-dialog-country-code">{selectedCityData.countryCode}</div>
          </div>
          <div className="city-dialog-name">{selectedCityData.name}</div>
          <div className="city-dialog-region">{selectedCityData.region}</div>
          <div className="city-dialog-divider" />
          <div className="city-dialog-tier">
            {selectedCityData.hubTier === 1 ? '🌐 Major Internet Hub' : '📡 Regional Hub'}
          </div>
          <div className="city-dialog-fact">{selectedCityData.friendlyFact}</div>
          <div className="city-dialog-stat">
            <span className="stat-icon">⚡</span>
            <span>{selectedCityData.heroStat}</span>
          </div>
          <div className="city-dialog-detail">{selectedCityData.fact}</div>
          <button className="city-dialog-close" onClick={closeCityDialog}>
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
});

GlobeSection.displayName = 'GlobeSection';
