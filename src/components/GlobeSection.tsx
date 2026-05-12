import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import Globe from 'globe.gl';
import * as topojson from 'topojson-client';
import { CITIES, CONNS, CONNECTIONS, ARC_COLORS, COMPANY_HUBS } from '../data/network';
import type { DecisionVisualImpact } from '../utils/simulationDecisionEngine';
import { getDecisionMarker, getGlobeLegendItems } from '../utils/globeLegend';
import { PacketDots } from './PacketDots';
import './GlobeSection.css';

interface GlobeSectionProps {
  selectedCity: number | null;
  selectedArc: number | null;
  simulationMode: string | null;
  decisionImpact: DecisionVisualImpact | null;
  onResetAll?: () => void;
  onCitySelect: (index: number | null) => void;
  onArcSelect: (index: number | null) => void;
  onModeChange: (mode: string) => void;
  onSimulationSelect?: (mode: string) => void;
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
const INITIAL_VISIBLE_CITY_COUNT = 30;
const INITIAL_PRIORITY_CITY_IDS = ['sgp', 'tok', 'lon', 'nyc', 'lax', 'syd', 'mum', 'dxb', 'fra', 'sao'];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const toRadians = (deg: number): number => (deg * Math.PI) / 180;

const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

type CityDialogPosition = {
  left: number;
  top: number;
  side: 'left' | 'right';
};

// Satellite texture (NASA Blue Marble)
const GLOBE_TEXTURE = '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const GLOBE_BUMP_MAP = '//unpkg.com/three-globe/example/img/earth-topology.png';

// Globe visual settings (dark mode)
const GLOBE_COLORS = {
  atmosphere: '#6b8aad',
  atmosphereAltitude: 0.16,
  surface: '#ffffff',
  specular: '#445566',
  emissive: '#000000',
  emissiveIntensity: 0.05,
  shininess: 18,
  countryCap: 'rgba(0, 0, 0, 0)',
  countrySide: 'rgba(0, 0, 0, 0)',
  countryStroke: 'rgba(255, 255, 255, 0.12)',
};

// Arc colors
const RESOLVED_ARC_COLORS: Record<string, string> = {
  ...ARC_COLORS,
};

export const GlobeSection = forwardRef<GlobeSectionRef, GlobeSectionProps>(
  ({ selectedCity, selectedArc, simulationMode, decisionImpact, onResetAll, onCitySelect, onArcSelect, onModeChange, onSimulationSelect }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const arcsDataRef = useRef<any[]>([]);
  const cityDialogRef = useRef<HTMLDivElement>(null);
  const simulationMenuRef = useRef<HTMLDivElement>(null);
  const [visibleCityIds, setVisibleCityIds] = useState<string[]>(() => {
    const orderedCities = [
      ...CITIES.filter((city) => INITIAL_PRIORITY_CITY_IDS.includes(city.id)),
      ...CITIES.filter((city) => city.hubTier === 1),
      ...CITIES,
    ];
    const uniqueIds: string[] = [];
    const seen = new Set<string>();
    orderedCities.forEach((city) => {
      if (seen.has(city.id)) return;
      seen.add(city.id);
      if (uniqueIds.length < INITIAL_VISIBLE_CITY_COUNT) {
        uniqueIds.push(city.id);
      }
    });
    return uniqueIds;
  });
  const [hintVisible, setHintVisible] = useState(true);
  const [isSimulationMenuOpen, setIsSimulationMenuOpen] = useState(false);
  const [cityDialogPosition, setCityDialogPosition] = useState<CityDialogPosition>({
    left: 40,
    top: 40,
    side: 'right',
  });
  const visibleCityIdSet = useMemo(() => new Set(visibleCityIds), [visibleCityIds]);

  const buildVisibleCityPoints = () =>
    CITIES
      .map((city, cityIndex) => ({ ...city, cityIndex }))
      .filter((city) => visibleCityIdSet.has(city.id));

  const buildVisibleOverlayData = () => {
    const visibleCityPoints = buildVisibleCityPoints();
    const visibleCityLabels = visibleCityPoints.map((city) => ({
      type: 'city-label' as const,
      lat: city.lat,
      lng: city.lng,
      name: city.name,
    }));
    const visibleCompanyHubs = COMPANY_HUBS.filter((hub) =>
      CITIES.some(
        (city) =>
          visibleCityIdSet.has(city.id) &&
          haversineKm(city.lat, city.lng, hub.lat, hub.lng) <= 140,
      ),
    );
    const companyHubOverlays = visibleCompanyHubs.map((hub) => ({
      type: 'company-hub' as const,
      lat: hub.lat,
      lng: hub.lng,
      name: hub.name,
      logoPath: hub.logoPath,
      markerColor: hub.markerColor,
      note: hub.note,
    }));
    return [...visibleCityLabels, ...companyHubOverlays];
  };

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
  }, [selectedCity, selectedArc, simulationMode, decisionImpact]);

  // (theme ref removed — dark-only)

  useEffect(() => {
    if (selectedCity === null) return;
    const selectedCityId = CITIES[selectedCity]?.id;
    if (!selectedCityId || visibleCityIdSet.has(selectedCityId)) return;
    setVisibleCityIds((prev) => [...prev, selectedCityId]);
  }, [selectedCity, visibleCityIdSet]);

  useEffect(() => {
    if (selectedArc === null) return;
    const conn = CONNECTIONS[selectedArc];
    if (!conn) return;
    const toAdd = [conn.from, conn.to].filter((cityId) => !visibleCityIdSet.has(cityId));
    if (toAdd.length === 0) return;
    setVisibleCityIds((prev) => [...prev, ...toAdd]);
  }, [selectedArc, visibleCityIdSet]);

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
    const isLightTheme = false;
    const isPacketLossMode = STATE.simulationMode === 'packet-loss';
    const isCableCutMode = STATE.simulationMode === 'cable-cut';
    const activeDecisionImpact =
      STATE.decisionImpact && STATE.decisionImpact.mode === STATE.simulationMode
        ? STATE.decisionImpact
        : null;
    const affectedArcIndices = new Set<number>();
    const highlightedCityIds = new Set(activeDecisionImpact?.consequence.highlightCities ?? []);
    const dimmedArcOpacity = 0.15;
    const decisionAccentColor = activeDecisionImpact
      ? activeDecisionImpact.consequence.impactType === 'positive'
        ? '#8ba389'
        : activeDecisionImpact.consequence.impactType === 'negative'
          ? '#9a7d7d'
          : '#8c8f9f'
      : null;
    const flickerMinOpacity = 0.28;
    const flickerRange = 0.34;
    const accentColor = '#8e9fb2';
    const ringColor = 'rgba(142, 159, 178, 0.48)';

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
    globe.pointRadius((d: any) => {
      const cityIndex = typeof d.cityIndex === 'number' ? d.cityIndex : CITIES.findIndex((city) => city.id === d.id);
      const city = cityIndex >= 0 ? CITIES[cityIndex] : null;
      if (city && highlightedCityIds.has(city.id)) return 0.92;
      return STATE.selectedCity === cityIndex ? 1.0 : 0.65;
    });

    // Update point color with glowing effect for selected
    globe.pointColor((d: any) => {
      const cityIndex = typeof d.cityIndex === 'number' ? d.cityIndex : CITIES.findIndex((city) => city.id === d.id);
      const city = cityIndex >= 0 ? CITIES[cityIndex] : null;
      if (city && highlightedCityIds.has(city.id) && activeDecisionImpact) {
        if (activeDecisionImpact.consequence.impactType === 'positive') {
          return '#8ba389';
        }
        if (activeDecisionImpact.consequence.impactType === 'negative') {
          return '#9a7d7d';
        }
        return '#8c8f9f';
      }
      return STATE.selectedCity === cityIndex ? accentColor : '#7f8fa3';
    });

    // Update arc stroke width — thicker for selected, AND vary by congestion in high-load mode
    globe.arcStroke((d: any, i: number) => {
      let baseStroke = 0.34;
      
      // In high-load mode, vary thickness based on congestion
      if (STATE.simulationMode === 'high-load') {
        const conn = CONNECTIONS[i];
        if (conn) {
          // congestionScore 0-100 → thickness multiplier 0.8-1.8
          const congestionFactor = 0.8 + (conn.congestionScore / 100) * 1.0;
          baseStroke = baseStroke * congestionFactor;
        }
      }
      
      if (STATE.selectedArc === i) return baseStroke + 0.22;
      if (activeDecisionImpact && affectedArcIndices.has(i)) return baseStroke + 0.28;
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
        baseColor = '#7e8694';
      } else if (isPacketLossMode) {
        baseColor = '#877c84';
        useFlickerOpacity = true;
      } else if (isCableCutMode) {
        baseColor = '#7a8694';
        if (STATE.selectedArc === i) {
          baseColor = '#9a7d7d';
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
              return hexToRgba('#9a7d7d', pulseOpacity);
            }
            return '#8ba389';
          }

          if (activeDecisionImpact.mode === 'cable-cut') {
            return activeDecisionImpact.consequence.impactType === 'negative' ? '#9a7d7d' : '#7f92a3';
          }

          return activeDecisionImpact.consequence.impactType === 'negative' ? '#9a7d7d' : '#8c8f9f';
        }
        if (
          activeDecisionImpact.mode === 'high-load' &&
          activeDecisionImpact.consequence.impactType === 'negative' &&
          affectedArcIndices.size === 0
        ) {
          return hexToRgba(baseColor, 0.92);
        }
        return hexToRgba(baseColor, 0.14);
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
            color: activeDecisionImpact.consequence.impactType === 'negative' ? '#9a7d7d' : '#8ba389',
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
          color: '#8a8088',
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
            color: '#9a7d7d',
            size: 1.6,
          },
          {
            lat: cutArc.startLat,
            lng: cutArc.startLng,
            text: '⚠',
            color: '#9a7d7d',
            size: 1.0,
          },
          {
            lat: cutArc.endLat,
            lng: cutArc.endLng,
            text: '⚠',
            color: '#9a7d7d',
            size: 1.0,
          },
        );
        
        // Add backup route indicator when alternatives exist
        if (conn && conn.backupRouteIds.length > 0) {
          labelsData.push({
            lat: (cutArc.startLat + cutArc.endLat) / 2 + 0.5,
            lng: (cutArc.startLng + cutArc.endLng) / 2,
            text: 'Reroute',
            color: '#8ba389',
            size: 0.85,
          });
        }
      } else {
        labelsData.push({
          lat: 14,
          lng: 0,
          text: '⚠',
          color: '#9a7d7d',
          size: 1.25,
        });
      }
    }

    // Add native flat center dots for all visible cities
    const cityLabelDots = buildVisibleCityPoints().map((city: any) => {
      const cityIndex = typeof city.cityIndex === 'number' ? city.cityIndex : CITIES.findIndex((c) => c.id === city.id);
      return {
        lat: city.lat,
        lng: city.lng,
        text: '',
        color: '#38bdf8',
        size: 0,
        isCityDot: true,
        cityIndex,
      };
    });
    
    const finalLabelsData = [...labelsData, ...cityLabelDots];

    globe
      .labelsData(finalLabelsData)
      .labelLat('lat')
      .labelLng('lng')
      .labelText('text')
      .labelSize('size')
      .labelColor('color')
      .labelDotRadius((d: any) => d.isCityDot ? (STATE.selectedCity === d.cityIndex ? 1.2 : 0.8) : (activeDecisionImpact ? 0.65 : 0.3))
      .labelAltitude((d: any) => d.isCityDot ? 0.005 : (activeDecisionImpact ? 0.06 : 0.01))
      .onLabelClick((d: any) => {
        if (d.isCityDot) {
          const clickedIndex = d.cityIndex;
          if (clickedIndex !== -1) {
            if (hintVisible) setHintVisible(false);
            STATE.selectedCity = STATE.selectedCity === clickedIndex ? null : clickedIndex;
            STATE.selectedArc = null;
            onArcSelect(null);
            onCitySelect(STATE.selectedCity);
            console.log('🖱️ City clicked:', CITIES[clickedIndex].name, '| Index:', clickedIndex);
            render();
          }
        }
      })
      .onLabelHover((label: any) => {
        if (globeRef.current && globeRef.current.controls()) {
          // Pause rotation if hovering a label OR if a city/arc is already selected
          globeRef.current.controls().autoRotate = !label && STATE.selectedCity === null && STATE.selectedArc === null;
          // Change cursor to pointer
          if (containerRef.current) {
            containerRef.current.style.cursor = label ? 'pointer' : 'grab';
          }
        }
      });

    console.log('🎯 Render — City:', STATE.selectedCity, '| Arc:', STATE.selectedArc, '| Mode:', STATE.simulationMode);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const arcsData = CONNS.map(([i, j, col]) => ({
      startLat: CITIES[i].lat,
      startLng: CITIES[i].lng,
      endLat: CITIES[j].lat,
      endLng: CITIES[j].lng,
      color: RESOLVED_ARC_COLORS[col],
    }));
    const visibleCityPoints = buildVisibleCityPoints();
    const globeOverlayData = buildVisibleOverlayData();

    // Store arcsData in ref for render function access
    arcsDataRef.current = arcsData;

    const W = containerRef.current.clientWidth;
    const H = containerRef.current.clientHeight;

    const globe = new Globe(containerRef.current!, { animateIn: false })
      .width(W)
      .height(H)
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl(GLOBE_TEXTURE)
      .bumpImageUrl(GLOBE_BUMP_MAP)
      .atmosphereColor(GLOBE_COLORS.atmosphere)
      .atmosphereAltitude(GLOBE_COLORS.atmosphereAltitude)
      .labelLabel((d: any) => {
        if (!d.isCityDot) return '';
        const city = CITIES[d.cityIndex];
        if (!city) return '';
        const tooltipBg = 'rgba(0,0,0,.95)';
        const tooltipBorder = 'rgba(255,255,255,.22)';
        const tooltipText = '#f1f1f1';
        const tooltipMuted = '#bdbdbd';
        const countryCode = typeof city.countryCode === 'string' ? city.countryCode : '';
        const flagSrc = countryCode ? flagImgUrl(countryCode) : '';
        const flagHtml = flagSrc
          ? `<img src="${flagSrc}" width="24" height="18" style="border-radius:2px;vertical-align:middle;box-shadow:0 1px 3px rgba(0,0,0,.25);" alt="${countryCode}" />`
          : '<span style="font-size:12px;opacity:.6;">•</span>';

        return `
          <div style="font-family:var(--sans);font-size:13px;
            background:${tooltipBg};border:1px solid ${tooltipBorder};
            padding:8px 12px;border-radius:6px;color:${tooltipText};
            max-width:240px;white-space:normal;line-height:1.5;">
            <div style="font-size:16px;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              ${flagHtml}
              <span style="font-family:var(--sans);font-size:10px;font-weight:600;letter-spacing:.02em;padding:1px 6px;border-radius:999px;border:1px solid ${tooltipBorder};background:color-mix(in srgb, ${tooltipText} 10%, transparent);">${countryCode}</span>
              <span>${city.name}</span>
            </div>
            <div style="color:${tooltipMuted};font-size:11px;line-height:1.45;">${city.friendlyFact}</div>
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
      .arcStroke(0.34)
      .arcDashLength(0.18)
      .arcDashGap(1.1)
      .arcDashAnimateTime(() => 2400 + Math.random() * 800)
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
      // Rings / region borders for cities
      .ringsData(visibleCityPoints)
      .ringLat('lat')
      .ringLng('lng')
      .ringColor((d: any) => {
        const cityIndex = typeof d.cityIndex === 'number' ? d.cityIndex : CITIES.findIndex((city) => city.id === d.id);
        return STATE.selectedCity === cityIndex ? 'rgba(56, 189, 248, 0.9)' : 'rgba(56, 189, 248, 0.45)';
      })
      .ringMaxRadius((d: any) => {
        const cityIndex = typeof d.cityIndex === 'number' ? d.cityIndex : CITIES.findIndex((city) => city.id === d.id);
        return STATE.selectedCity === cityIndex ? 2.6 : 1.6;
      })
      .ringPropagationSpeed(1.2)
      .ringRepeatPeriod(1800)
      // Countries
      .polygonsData([])
      .polygonCapColor(() => GLOBE_COLORS.countryCap)
      .polygonSideColor(() => GLOBE_COLORS.countrySide)
      .polygonStrokeColor(() => GLOBE_COLORS.countryStroke)
      .polygonAltitude(0.004)
      // City labels + company infra square markers
      .htmlElementsData(globeOverlayData)
      .htmlLat((d: any) => d.lat)
      .htmlLng((d: any) => d.lng)
      .htmlAltitude((d: any) => d.type === 'company-hub' ? 0.03 : 0.015)
      .htmlElement((d: any) => {
        if (d.type === 'company-hub') {
          const wrap = document.createElement('div');
          wrap.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            transform: translate(-50%, -50%);
            pointer-events: none;
            user-select: none;
          `;

          const square = document.createElement('div');
          square.style.cssText = `
            width: 22px;
            height: 22px;
            border-radius: 4px;
            background: color-mix(in srgb, ${d.markerColor} 14%, #0f172a);
            border: 2px solid ${d.markerColor};
            box-shadow: 0 0 12px color-mix(in srgb, ${d.markerColor} 45%, transparent);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          `;
          square.title = `${d.name} — ${d.note}`;

          const logo = document.createElement('img');
          logo.src = d.logoPath;
          logo.alt = d.name;
          logo.style.cssText = `
            width: 14px;
            height: 14px;
            object-fit: contain;
            display: block;
          `;
          square.appendChild(logo);

          const label = document.createElement('div');
          label.style.cssText = `
            font-family: var(--sans);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.03em;
            color: #cbd5e1;
            text-shadow: 0 0 6px rgba(2,6,23,0.85);
            white-space: nowrap;
          `;
          label.textContent = d.name;

          wrap.appendChild(square);
          wrap.appendChild(label);
          return wrap;
        }

        const el = document.createElement('div');
        el.style.cssText = `
          font-family: var(--sans);
          font-size: 10px;
          font-weight: 500;
          color: #e2e8f0;
          text-shadow: 0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5);
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          transform: translate(-50%, -100%);
          padding-bottom: 8px;
          letter-spacing: 0.04em;
        `;
        el.textContent = d.name;
        return el;
      });

    // Style the globe surface — white base so satellite texture is unmodified
    globe.globeMaterial().color.set(GLOBE_COLORS.surface);
    globe.globeMaterial().specular.set(GLOBE_COLORS.specular);
    globe.globeMaterial().shininess = GLOBE_COLORS.shininess;
    globe.globeMaterial().emissive.set(GLOBE_COLORS.emissive);
    globe.globeMaterial().emissiveIntensity = GLOBE_COLORS.emissiveIntensity;

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
  }, []);



  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current
      .ringsData(buildVisibleCityPoints())
      .htmlElementsData(buildVisibleOverlayData());
    render();
  }, [visibleCityIds]);

  useEffect(() => {
    if (!globeRef.current || !decisionImpact || decisionImpact.mode !== simulationMode) return;

    const impactedCityIds = new Set<string>(decisionImpact.consequence.highlightCities ?? []);
    let firstImpactedConnection: (typeof CONNECTIONS)[number] | null = null as (typeof CONNECTIONS)[number] | null;
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
  }, [simulationMode, decisionImpact, selectedCity, selectedArc]);

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

  useEffect(() => {
    if (!isSimulationMenuOpen) return;

    const handleWindowMouseDown = (event: MouseEvent) => {
      if (simulationMenuRef.current?.contains(event.target as Node)) return;
      setIsSimulationMenuOpen(false);
    };
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSimulationMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleWindowMouseDown);
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleWindowMouseDown);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [isSimulationMenuOpen]);

  useImperativeHandle(ref, () => ({
    globeRef,
    triggerJourney,
    triggerReset,
  }));

  // Get selected city data for overlay
  const selectedCityData = selectedCity !== null ? CITIES[selectedCity] : null;
  const selectedCityCompanyHubs = selectedCityData
    ? COMPANY_HUBS
        .map(hub => ({
          ...hub,
          distanceKm: haversineKm(selectedCityData.lat, selectedCityData.lng, hub.lat, hub.lng),
        }))
        .filter(hub => hub.distanceKm <= 140)
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : [];
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
  const activeMode = simulationMode || 'normal';
  const simulationModes = [
    { id: 'normal', label: 'Normal', tone: 'normal' },
    { id: 'high-load', label: 'Rush Hour', tone: 'warn' },
    { id: 'packet-loss', label: 'Packet Loss', tone: 'loss' },
    { id: 'cable-cut', label: 'Cable Break', tone: 'danger' },
  ] as const;
  const simulationModeInfo: Record<string, { title: string; detail: string; tone: string }> = {
    normal: {
      title: 'Normal',
      detail: 'Traffic is balanced and routes stay stable with no major rerouting.',
      tone: 'normal',
    },
    'high-load': {
      title: 'Rush Hour',
      detail: 'Demand spikes increase route pressure and can raise waiting time.',
      tone: 'warn',
    },
    'packet-loss': {
      title: 'Packet Loss',
      detail: 'Some data packets drop and must be re-sent, causing unstable flow.',
      tone: 'loss',
    },
    'cable-cut': {
      title: 'Cable Break',
      detail:
        selectedArc !== null
          ? 'The selected route is cut and traffic is rerouted to backup paths.'
          : 'Select a route to cut and inspect outage impact and rerouting behavior.',
      tone: 'danger',
    },
  };
  const activeModeInfo = simulationModeInfo[activeMode] ?? simulationModeInfo.normal;
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

  const handleSimulationControlClick = (mode: string) => {
    setIsSimulationMenuOpen(false);
    if (onSimulationSelect) {
      onSimulationSelect(mode);
      return;
    }
    onModeChange(mode);
  };

  return (
    <div className="globe-section">
      <div ref={containerRef} className="globe-container"></div>
      <button className="globe-reset-all-btn" onClick={handleResetAll}>
        Reset view
      </button>
      <div ref={simulationMenuRef} className="globe-sim-menu">
        <button
          className={`globe-sim-menu-trigger ${isSimulationMenuOpen ? 'is-open' : ''}`}
          onClick={() => setIsSimulationMenuOpen(prev => !prev)}
          aria-label="Open simulation mode menu"
          aria-expanded={isSimulationMenuOpen}
          aria-haspopup="dialog"
        >
          <span className="globe-sim-menu-lines" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        {isSimulationMenuOpen && (
          <div className="globe-sim-controls" role="dialog" aria-label="Simulation mode selection">
            <div className="globe-sim-menu-title">Simulation mode</div>
            <div className="globe-sim-chips">
              {simulationModes.map((mode) => (
                <button
                  key={mode.id}
                  className={`globe-sim-chip globe-sim-chip--${mode.tone} ${activeMode === mode.id ? 'globe-sim-chip--active' : ''}`}
                  onClick={() => handleSimulationControlClick(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div className={`globe-sim-info globe-sim-info--${activeModeInfo.tone}`}>
              <div className="globe-sim-info-title">{activeModeInfo.title}</div>
              <div className="globe-sim-info-detail">{activeModeInfo.detail}</div>
            </div>
          </div>
        )}
      </div>
      <PacketDots globeRef={globeRef} />
      {hintVisible && (
        <div className="globe-hint">
          Tap any city to begin
        </div>
      )}
      {decisionBadge && (
        <div className={`globe-decision-badge globe-decision-badge--${decisionBadge.tone}`}>
          <div className="globe-sim-badge-title">{decisionBadge.title}</div>
          <div className="globe-sim-badge-detail">{decisionBadge.detail}</div>
        </div>
      )}
      <div className="globe-legend">
        <div className="globe-legend-title">Globe legend</div>
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
            {selectedCityData.hubTier === 1 ? 'Major internet hub' : 'Regional hub'}
          </div>
          <div className="city-dialog-fact">{selectedCityData.friendlyFact}</div>
          <div className="city-dialog-stat">
            <span className="stat-icon">•</span>
            <span>{selectedCityData.heroStat}</span>
          </div>
          {selectedCityCompanyHubs.length > 0 && (
            <div className="city-dialog-company-section">
              <div className="city-dialog-company-title">Data center and company hubs in this area</div>
              <div className="city-dialog-company-list">
                {selectedCityCompanyHubs.map((hub) => (
                  <div key={hub.id} className="city-dialog-company-item">
                    <div className="city-dialog-company-head">
                      <img
                        src={hub.logoPath}
                        width={36}
                        height={36}
                        alt={hub.name}
                        className="city-dialog-company-logo"
                      />
                      <div className="city-dialog-company-name-group">
                        <span className="city-dialog-company-name">{hub.name}</span>
                        <span className="city-dialog-company-distance">{Math.round(hub.distanceKm)} km from center</span>
                      </div>
                    </div>
                    <div className="city-dialog-company-focus">{hub.focus}</div>
                    <div className="city-dialog-company-note">{hub.visitorFact}</div>
                    <div className="city-dialog-company-map">
                      <iframe
                        width="100%"
                        height="140"
                        style={{ border: 0, borderRadius: '8px', marginTop: '12px', background: '#0f172a' }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(hub.name + ' office ' + selectedCityData.name)}&t=k&z=12&ie=UTF8&iwloc=&output=embed`}
                      ></iframe>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="city-dialog-detail">{selectedCityData.fact}</div>
          <button className="city-dialog-close" onClick={closeCityDialog}>
            Close
          </button>
        </div>
      )}
    </div>
  );
});

GlobeSection.displayName = 'GlobeSection';
