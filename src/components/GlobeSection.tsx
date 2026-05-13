import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import Globe from 'globe.gl';
import * as topojson from 'topojson-client';
import { CITIES, CONNS, CONNECTIONS, ARC_COLORS, COMPANY_HUBS, ensureDirectConnection } from '../data/network';
import type { DecisionVisualImpact } from '../utils/simulationDecisionEngine';
import { getDecisionMarker, getGlobeLegendItems } from '../utils/globeLegend';
import { PacketDots } from './PacketDots';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '../app/components/ui/dropdown-menu';
import { Switch } from '../app/components/ui/switch';
import { Button } from '../app/components/ui/button';
import { Info, Layers } from 'lucide-react';
import './GlobeSection.css';

const STARLINK_SATS = Array.from({ length: 40 }).map((_, i) => ({
  type: 'satellite' as const,
  id: `sat-${i}`,
  lat: (Math.random() - 0.5) * 160,
  lng: (Math.random() - 0.5) * 360,
}));

const INSPECTOR_IMAGES = {
  fiber: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1200',
  dataCenter: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=1200',
  satellite: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1200',
};
interface GlobeSectionProps {
  selectedCity: number | null;
  selectedArc: number | null;
  simulationMode: string | null;
  decisionImpact: DecisionVisualImpact | null;
  scenarioStory?: string | null;
  scenarioRoute?: { fromId?: string; toId?: string } | null;
  onResetAll?: () => void;
  onCitySelect: (index: number | null) => void;
  onArcSelect: (index: number | null) => void;
  onModeChange: (mode: string) => void;
  onSimulationSelect?: (mode: string) => void;
}

type InspectorData = {
  title: string;
  eyebrow: string;
  imageUrl: string;
  logoUrl?: string;
  body: string;
  facts: Array<{ label: string; value: string }>;
};

type PreviewFocus = {
  type: 'fiber' | 'company' | 'satellite';
  lat: number;
  lng: number;
  label: string;
  accent: string;
  arcIndex?: number;
};

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
  scenarioRoute: null as { fromId: string; toId: string } | null,
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
const GLOBAL_SIMULATION_ARC_LIMIT = 24;

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

const interpolateGreatCircle = (lat1: number, lng1: number, lat2: number, lng2: number, t: number) => {
  const phi1 = toRadians(lat1);
  const theta1 = toRadians(lng1);
  const phi2 = toRadians(lat2);
  const theta2 = toRadians(lng2);

  const x1 = Math.cos(phi1) * Math.cos(theta1);
  const y1 = Math.cos(phi1) * Math.sin(theta1);
  const z1 = Math.sin(phi1);

  const x2 = Math.cos(phi2) * Math.cos(theta2);
  const y2 = Math.cos(phi2) * Math.sin(theta2);
  const z2 = Math.sin(phi2);

  const dot = clamp(x1 * x2 + y1 * y2 + z1 * z2, -1, 1);
  const omega = Math.acos(dot);
  if (omega === 0) return { lat: lat1, lng: lng1 };

  const sinOmega = Math.sin(omega);
  const w1 = Math.sin((1 - t) * omega) / sinOmega;
  const w2 = Math.sin(t * omega) / sinOmega;

  let x = x1 * w1 + x2 * w2;
  let y = y1 * w1 + y2 * w2;
  let z = z1 * w1 + z2 * w2;

  const mag = Math.sqrt(x*x + y*y + z*z);
  x /= mag; y /= mag; z /= mag;

  const lat = Math.asin(z) * 180 / Math.PI;
  const lng = Math.atan2(y, x) * 180 / Math.PI;
  
  return { lat, lng };
};

const getArcFocusAltitude = (distanceKm: number): number => {
  if (distanceKm >= 12500) return 1.62;
  if (distanceKm >= 9000) return 1.42;
  if (distanceKm >= 6500) return 1.2;
  if (distanceKm >= 3500) return 1.0;
  return 0.82;
};

const getSampledGlobalArcIndices = (): number[] => {
  const priorityIds = new Set([
    'lax-tok-faster',
    'tok-sgp-jupiter',
    'lax-sgp-sea-us',
    'nyc-lon-aec1',
    'lon-fra-terrestrial',
    'sgp-mum-smew4',
    'mum-dxb-smew5',
    'dxb-lon-flag',
    'nyc-sao-seabras1',
    'syd-sgp-indigo',
    'syd-lax-sc',
    'dxb-fra-smw5',
    'lon-sgp-smew3',
    'nyc-fra-tat14',
    'syd-tok-bass',
    'lax-sao-pan-am',
  ]);
  const selected = new Set<number>();

  CONNECTIONS.forEach((connection, index) => {
    if (priorityIds.has(connection.id)) selected.add(index);
  });

  for (let index = 0; selected.size < GLOBAL_SIMULATION_ARC_LIMIT && index < CONNECTIONS.length; index += 1) {
    const connection = CONNECTIONS[index];
    if (connection.distanceKm < 2500) continue;
    selected.add(index);
  }

  return Array.from(selected).slice(0, GLOBAL_SIMULATION_ARC_LIMIT);
};

const getDefaultCableCutArcIndex = (): number => {
  const preferredIds = ['nyc-lon-aec1', 'lax-tok-faster', 'sgp-mum-smew4', 'syd-sgp-indigo'];
  const preferredIndex = preferredIds
    .map((id) => CONNECTIONS.findIndex((connection) => connection.id === id))
    .find((index) => index >= 0);
  return preferredIndex ?? 0;
};

const pickRandomIndex = (length: number): number => Math.floor(Math.random() * length);

const getCableCutReasonText = (
  story: string | null | undefined,
  connection: (typeof CONNECTIONS)[number] | undefined,
): string => {
  const normalizedStory = (story ?? '').toLowerCase();
  const disasterPattern = /earthquake|disaster|tsunami|hurricane|storm|seismic|landslide/i;
  if (disasterPattern.test(normalizedStory)) return 'Disaster damaged the fiber segment.';

  const sharkPattern = /shark|bite/i;
  if (sharkPattern.test(normalizedStory)) return 'Shark bite damaged the fiber.';

  const anchorPattern = /anchor|ship|vessel|trawler|boat/i;
  if (anchorPattern.test(normalizedStory) || connection?.type === 'Subsea cable') {
    return 'Ship anchor dragged across the cable.';
  }

  return 'Fiber segment failed on this route.';
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
  ({ selectedCity, selectedArc, simulationMode, decisionImpact, scenarioStory, scenarioRoute, onResetAll, onCitySelect, onArcSelect, onModeChange, onSimulationSelect }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const arcsDataRef = useRef<any[]>([]);
  const cityDialogRef = useRef<HTMLDivElement>(null);
  const rotationLockedRef = useRef(false);
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
  const [routeSourceCityId, setRouteSourceCityId] = useState<string | null>(null);
  const [inspectorData, setInspectorData] = useState<InspectorData | null>(null);
  const [previewFocus, setPreviewFocus] = useState<PreviewFocus | null>(null);
  const [cityDialogPosition, setCityDialogPosition] = useState<CityDialogPosition>({
    left: 40,
    top: 40,
    side: 'right',
  });
  const visibleCityIdSet = useMemo(() => new Set(visibleCityIds), [visibleCityIds]);

  const [layers, setLayers] = useState({
    arcs: true,
    fibers: true,
    packets: true,
    rings: true,
    hubs: true,
    satellites: true,
  });
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [legendMenuOpen, setLegendMenuOpen] = useState(false);

  useEffect(() => {
    if (globeRef.current) {
      render();
    }
  }, [layers, routeSourceCityId, previewFocus]);

  const buildVisibleCityPoints = () =>
    CITIES
      .map((city, cityIndex) => ({ ...city, cityIndex }))
      .filter((city) => visibleCityIdSet.has(city.id));

  const buildVisibleOverlayData = () => {
    const isSimActive = STATE.simulationMode !== 'normal';
    const selectedArcIndex = STATE.selectedArc;

    const visibleCityPoints = buildVisibleCityPoints();
    
    let filteredCities = visibleCityPoints;
    const sampledGlobalSimulation = isSimActive && selectedArcIndex === null;
    let filteredHubs = layers.hubs && !sampledGlobalSimulation ? COMPANY_HUBS : [];
    let filteredSats = layers.satellites && !sampledGlobalSimulation ? STARLINK_SATS : [];

    // If simulation is active and an arc is focused, hide everything else for visual clarity
    if (isSimActive && selectedArcIndex !== null) {
      const conn = CONNECTIONS[selectedArcIndex];
      filteredCities = visibleCityPoints.filter(city => city.id === conn.from || city.id === conn.to);
      filteredHubs = [];
      filteredSats = [];
    }

    const visibleCityLabels = filteredCities.map((city) => ({
      type: 'city-label' as const,
      lat: city.lat,
      lng: city.lng,
      name: city.name,
    }));
    
    const visibleCompanyHubs = filteredHubs.filter((hub) =>
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
    
    return [...visibleCityLabels, ...companyHubOverlays, ...filteredSats];
  };

  const getRouteCities = () => {
    const route = STATE.scenarioRoute;
    if (route?.fromId && route?.toId) {
      const fromCity = CITIES.find((city) => city.id === route.fromId);
      const toCity = CITIES.find((city) => city.id === route.toId);
      if (fromCity && toCity) return { fromCity, toCity };
    }
    if (STATE.selectedArc !== null && CONNECTIONS[STATE.selectedArc]) {
      const conn = CONNECTIONS[STATE.selectedArc];
      const fromCity = CITIES.find((city) => city.id === conn.from);
      const toCity = CITIES.find((city) => city.id === conn.to);
      if (fromCity && toCity) return { fromCity, toCity };
    }
    return null;
  };

  const openRouteInspector = (arcIndex: number) => {
    const connection = CONNECTIONS[arcIndex];
    const conn = CONNS[arcIndex];
    if (!connection || !conn || !globeRef.current) return;

    const routeCities = STATE.scenarioRoute && STATE.selectedArc === arcIndex
      ? getRouteCities()
      : null;
    const fromCity = routeCities?.fromCity ?? CITIES[conn[0]];
    const toCity = routeCities?.toCity ?? CITIES[conn[1]];
    const midpoint = interpolateGreatCircle(fromCity.lat, fromCity.lng, toCity.lat, toCity.lng, 0.5);

    globeRef.current.controls?.() && (globeRef.current.controls().autoRotate = false);
    globeRef.current.pointOfView({ lat: midpoint.lat, lng: midpoint.lng, altitude: 1.65 }, 900);
    setInspectorData({
      eyebrow: connection.type,
      title: `${fromCity.name} → ${toCity.name}`,
      imageUrl: INSPECTOR_IMAGES.fiber,
      body: 'A fiber route carries data as pulses of light through glass strands. Long routes often cross oceans as protected submarine cables, then connect into land fiber and data centers near major cities.',
      facts: [
        { label: 'Cable', value: connection.cable },
        { label: 'Latency', value: `${connection.latency} ms` },
        { label: 'Distance', value: `${connection.distanceKm.toLocaleString()} km` },
        { label: 'Capacity', value: connection.bandwidth },
      ],
    });
  };

  const openCompanyInspector = (hub: any) => {
    if (!globeRef.current) return;
    globeRef.current.controls?.() && (globeRef.current.controls().autoRotate = false);
    globeRef.current.pointOfView({ lat: hub.lat, lng: hub.lng, altitude: 0.92 }, 800);
    setInspectorData({
      eyebrow: 'Cloud and data-center infrastructure',
      title: hub.name,
      imageUrl: INSPECTOR_IMAGES.dataCenter,
      logoUrl: hub.logoPath,
      body: 'Company hubs represent cloud regions, edge locations, carrier hotels, and data-center clusters. They keep apps close to users and exchange traffic directly with nearby networks.',
      facts: [
        { label: 'Focus', value: hub.note ?? 'Network infrastructure hub' },
        { label: 'Role', value: 'Stores, processes, or accelerates internet traffic' },
        { label: 'Why it matters', value: 'Shorter distance usually means lower delay and faster loading' },
      ],
    });
  };

  const closeInspector = () => {
    setInspectorData(null);
    setPreviewFocus(null);
    const controls = globeRef.current?.controls?.();
    if (controls) {
      controls.autoRotate = true;
    }
  };

  const openSatelliteInspector = (satellite: any) => {
    if (!globeRef.current) return;
    globeRef.current.controls?.() && (globeRef.current.controls().autoRotate = false);
    globeRef.current.pointOfView({ lat: satellite.lat, lng: satellite.lng, altitude: 1.25 }, 800);
    setInspectorData({
      eyebrow: 'Low-earth-orbit satellite link',
      title: 'Starlink satellite relay',
      imageUrl: INSPECTOR_IMAGES.satellite,
      body: 'LEO satellite internet sends data between a user dish, satellites above Earth, and ground gateways connected to the fiber internet. It helps remote areas connect where cables are limited.',
      facts: [
        { label: 'Orbit type', value: 'Low Earth Orbit' },
        { label: 'Best use', value: 'Remote homes, ships, aircraft, and backup links' },
        { label: 'Tradeoff', value: 'Usually higher latency than nearby fiber, but wider coverage' },
      ],
    });
  };

  const openFiberComponentInfo = (colorKey?: 'amber' | 'teal' | 'steel') => {
    const candidateArcIndices = CONNS
      .map((conn, index) => ({ conn, index }))
      .filter(({ conn, index }) => {
        const connection = CONNECTIONS[index];
        if (!connection) return false;
        if (colorKey && conn[2] !== colorKey) return false;
        return colorKey ? true : connection.type === 'Subsea cable' || connection.distanceKm > 3500;
      })
      .map(({ index }) => index);
    const routeIndex = candidateArcIndices[pickRandomIndex(candidateArcIndices.length)] ?? pickRandomIndex(CONNECTIONS.length);
    const connection = CONNECTIONS[routeIndex];
    const conn = CONNS[routeIndex];
    let previewLabel = 'Fiber route';
    if (globeRef.current && connection && conn) {
      const fromCity = CITIES[conn[0]];
      const toCity = CITIES[conn[1]];
      const midpoint = interpolateGreatCircle(fromCity.lat, fromCity.lng, toCity.lat, toCity.lng, 0.5);
      previewLabel = colorKey === 'teal' ? 'Teal fiber route' : colorKey === 'steel' ? 'Blue fiber route' : colorKey === 'amber' ? 'Amber fiber route' : 'Fiber route';
      const controls = globeRef.current.controls?.();
      if (controls) controls.autoRotate = false;
      globeRef.current.pointOfView(
        { lat: midpoint.lat, lng: midpoint.lng, altitude: getArcFocusAltitude(connection.distanceKm) },
        900,
      );
      setPreviewFocus({
        type: 'fiber',
        lat: midpoint.lat,
        lng: midpoint.lng,
        label: previewLabel,
        accent: RESOLVED_ARC_COLORS[conn[2]] ?? '#67e8f9',
        arcIndex: routeIndex,
      });
    }

    setInspectorData({
      eyebrow: 'Physical network component',
      title: previewLabel,
      imageUrl: INSPECTOR_IMAGES.fiber,
      body: 'Fiber optic cable is the physical path that carries internet traffic as pulses of light. On the globe, fiber routes represent high-capacity backbone links between major cities, regions, and continents.',
      facts: [
        { label: 'Signal', value: 'Laser light pulses inside thin glass strands' },
        { label: 'Role', value: 'Moves large traffic volumes across backbone routes' },
        { label: 'Why it matters', value: 'Most long-distance internet traffic still depends on fiber' },
      ],
    });
  };

  const openCompanyComponentInfo = () => {
    const hub = COMPANY_HUBS[pickRandomIndex(COMPANY_HUBS.length)];
    if (globeRef.current && hub) {
      const nearestCity = CITIES
        .map((city) => ({
          id: city.id,
          distanceKm: haversineKm(city.lat, city.lng, hub.lat, hub.lng),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)[0];
      if (nearestCity) {
        setVisibleCityIds((prev) => Array.from(new Set([...prev, nearestCity.id])));
      }

      const controls = globeRef.current.controls?.();
      if (controls) controls.autoRotate = false;
      globeRef.current.pointOfView({ lat: hub.lat, lng: hub.lng, altitude: 0.74 }, 900);
      setPreviewFocus({
        type: 'company',
        lat: hub.lat,
        lng: hub.lng,
        label: hub.name,
        accent: hub.markerColor ?? '#f8fafc',
      });
    }

    setInspectorData({
      eyebrow: 'Cloud and data-center infrastructure',
      title: hub ? `${hub.name} example` : 'Cloud and data-center operators',
      imageUrl: INSPECTOR_IMAGES.dataCenter,
      logoUrl: hub?.logoPath,
      body: 'Company logo tiles mark operators that run cloud regions, edge networks, carrier-neutral data centers, CDNs, satellite gateways, or backbone infrastructure near major internet hubs.',
      facts: [
        { label: 'Example focus', value: hub?.note ?? 'Cloud or data-center infrastructure hub' },
        { label: 'Role', value: 'Host apps, cache content, exchange traffic, or connect users into the internet' },
        { label: 'Why it matters', value: 'Closer infrastructure usually reduces delay and improves reliability' },
      ],
    });
  };

  const openSatelliteComponentInfo = () => {
    const satellite = STARLINK_SATS[pickRandomIndex(STARLINK_SATS.length)];
    if (globeRef.current && satellite) {
      const controls = globeRef.current.controls?.();
      if (controls) controls.autoRotate = false;
      globeRef.current.pointOfView({ lat: satellite.lat, lng: satellite.lng, altitude: 1.12 }, 900);
      setPreviewFocus({
        type: 'satellite',
        lat: satellite.lat,
        lng: satellite.lng,
        label: 'LEO satellite',
        accent: '#93c5fd',
      });
    }

    setInspectorData({
      eyebrow: 'Wireless network component',
      title: 'Low-earth-orbit satellite link',
      imageUrl: INSPECTOR_IMAGES.satellite,
      body: 'LEO satellite markers represent orbital internet links. Traffic can travel from a user terminal to satellites, then down to ground gateways that connect back into the fiber internet.',
      facts: [
        { label: 'Best use', value: 'Remote areas, ships, aircraft, emergency backup, and rural coverage' },
        { label: 'Tradeoff', value: 'Wider reach than fiber, but usually more variable latency' },
        { label: 'Ground link', value: 'Satellites still need gateways connected to terrestrial networks' },
      ],
    });
  };

  const openLegendComponentInfo = (itemId: string) => {
    if (itemId === 'route-amber') {
      openFiberComponentInfo('amber');
      return;
    }
    if (itemId === 'route-teal') {
      openFiberComponentInfo('teal');
      return;
    }
    if (itemId === 'route-blue') {
      openFiberComponentInfo('steel');
      return;
    }
    if (itemId === 'subsea-cable') {
      openFiberComponentInfo();
      return;
    }
    if (itemId === 'company-logo') {
      openCompanyComponentInfo();
      return;
    }
    if (itemId === 'satellite-leo') {
      openSatelliteComponentInfo();
    }
  };

  const legendInfoItemIds = new Set([
    'route-amber',
    'route-teal',
    'route-blue',
    'subsea-cable',
    'company-logo',
    'satellite-leo',
  ]);

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
    STATE.scenarioRoute =
      scenarioRoute?.fromId && scenarioRoute?.toId
        ? { fromId: scenarioRoute.fromId, toId: scenarioRoute.toId }
        : null;
    if (newMode === 'cable-cut' && selectedArc === null && !STATE.scenarioRoute) {
      const fallbackArc = getDefaultCableCutArcIndex();
      STATE.selectedArc = fallbackArc;
      onArcSelect(fallbackArc);
      setRouteSourceCityId(null);
      return;
    }
    if (selectedArc !== null || selectedCity === null) {
      setRouteSourceCityId(null);
    }

    const globe = globeRef.current;
    const controls = globe.controls ? globe.controls() : null;
    const isSimulationFocus = newMode !== 'normal' && selectedArc !== null;
    if (isSimulationFocus) {
      rotationLockedRef.current = true;
    }

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
    // Zoom to specific arc (useful for cable breaks)
    else if (selectedArc !== null && CONNS[selectedArc]) {
      const conn = CONNS[selectedArc];
      const routeCities = getRouteCities();
      const fromCity = routeCities?.fromCity ?? CITIES[conn[0]];
      const toCity = routeCities?.toCity ?? CITIES[conn[1]];
      const midpoint = interpolateGreatCircle(fromCity.lat, fromCity.lng, toCity.lat, toCity.lng, 0.5);
      const routeDistanceKm =
        CONNECTIONS[selectedArc]?.distanceKm ??
        haversineKm(fromCity.lat, fromCity.lng, toCity.lat, toCity.lng);
      const routeAltitude =
        newMode === 'cable-cut'
          ? Math.max(1.75, getArcFocusAltitude(routeDistanceKm) + 0.22)
          : getArcFocusAltitude(routeDistanceKm);
      
      if (controls) controls.autoRotate = false;
      globe.pointOfView({ lat: midpoint.lat, lng: midpoint.lng, altitude: routeAltitude }, 1200);
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
          if (currentControls && STATE.selectedCity === null && !rotationLockedRef.current) {
            currentControls.autoRotate = true;
          }
        }
      }, 1400);
      setHintVisible(false);
    }
    // Reset state — resume rotation
    else if (selectedCity === null && selectedArc === null) {
      if (controls && !rotationLockedRef.current) controls.autoRotate = true;
    }

    // Always trigger a render to update visuals (colors, radius, etc.)
    render();
  }, [selectedCity, selectedArc, simulationMode, decisionImpact, scenarioStory, scenarioRoute]);

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
    setRouteSourceCityId(null);
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
    setRouteSourceCityId(null);
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
    const focusedSimulation = STATE.simulationMode !== 'normal' && STATE.selectedArc !== null;
    const sampledGlobalSimulation = STATE.simulationMode !== 'normal' && STATE.selectedArc === null;
    if (focusedSimulation) {
      console.log('[Globe] focused sim', {
        mode: STATE.simulationMode,
        selectedArc: STATE.selectedArc,
        scenarioRoute: STATE.scenarioRoute,
      });
    }
    const arcIndices = focusedSimulation
      ? [STATE.selectedArc as number]
      : sampledGlobalSimulation
        ? getSampledGlobalArcIndices()
        : CONNS.map((_, index) => index);
    const refreshedArcsData = arcIndices
      .map((arcIndex) => {
        const conn = CONNS[arcIndex];
        if (!conn) return null;
        const [i, j, col] = conn;
        let startLat = CITIES[i].lat;
        let startLng = CITIES[i].lng;
        let endLat = CITIES[j].lat;
        let endLng = CITIES[j].lng;

        if (focusedSimulation && STATE.selectedArc === arcIndex && STATE.scenarioRoute) {
          const fromCity = CITIES.find((city) => city.id === STATE.scenarioRoute?.fromId);
          const toCity = CITIES.find((city) => city.id === STATE.scenarioRoute?.toId);
          if (fromCity && toCity) {
            startLat = fromCity.lat;
            startLng = fromCity.lng;
            endLat = toCity.lat;
            endLng = toCity.lng;
          }
        }

        return {
          startLat,
          startLng,
          endLat,
          endLng,
          color: RESOLVED_ARC_COLORS[col],
          arcIndex,
        };
      })
      .filter((arc): arc is { startLat: number; startLng: number; endLat: number; endLng: number; color: string; arcIndex: number } => arc !== null);

    arcsDataRef.current = refreshedArcsData;
    globe.arcsData(layers.arcs ? refreshedArcsData : []);
    
    const dynamicHtmlElements = buildVisibleOverlayData();
    if (previewFocus) {
      dynamicHtmlElements.push({
        type: 'component-preview',
        lat: previewFocus.lat,
        lng: previewFocus.lng,
        label: previewFocus.label,
        previewType: previewFocus.type,
        accent: previewFocus.accent,
      });
    }

    if (focusedSimulation && refreshedArcsData[0]) {
      const activeArc = refreshedArcsData[0];
      console.log('[Globe] arc endpoints', {
        startLat: activeArc.startLat,
        startLng: activeArc.startLng,
        endLat: activeArc.endLat,
        endLng: activeArc.endLng,
      });
    }

    const backbonePaths = focusedSimulation || !layers.fibers
      ? []
      : refreshedArcsData
          .filter((arc) => haversineKm(arc.startLat, arc.startLng, arc.endLat, arc.endLng) > 3500)
          .map((arc) => ({
            coords: [
              [arc.startLat, arc.startLng],
              [arc.endLat, arc.endLng],
            ],
          }));
    globe.pathsData(backbonePaths);
    globe.arcAltitude(focusedSimulation ? 0 : 0.28);
    const isLightTheme = false;
    const isPacketLossMode = STATE.simulationMode === 'packet-loss';
    const isCableCutMode = STATE.simulationMode === 'cable-cut';
    const isSimulationActive = STATE.simulationMode !== 'normal';
    const simulatedConnection = STATE.selectedArc !== null ? CONNECTIONS[STATE.selectedArc] : null;
    const simulatedCityIds = new Set<string>();
    if (isSimulationActive && simulatedConnection) {
      simulatedCityIds.add(simulatedConnection.from);
      simulatedCityIds.add(simulatedConnection.to);
    }
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
    const flickerMinOpacity = 0.48;
    const flickerRange = 0.42;
    const accentColor = '#8e9fb2';
    const ringColor = 'rgba(142, 159, 178, 0.48)';
    const simulationNodeColor =
      STATE.simulationMode === 'high-load'
        ? '#f6b84f'
        : STATE.simulationMode === 'packet-loss'
          ? '#ff7d7d'
          : STATE.simulationMode === 'cable-cut'
            ? '#ff4d4d'
            : accentColor;

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
    simulatedCityIds.forEach((cityId) => highlightedCityIds.add(cityId));

    // Update point radius based on selection
    globe.pointRadius((d: any) => {
      const cityIndex = typeof d.cityIndex === 'number' ? d.cityIndex : CITIES.findIndex((city) => city.id === d.id);
      const city = cityIndex >= 0 ? CITIES[cityIndex] : null;
      if (city && simulatedCityIds.has(city.id)) return 0.98;
      if (city && highlightedCityIds.has(city.id)) return 0.92;
      return STATE.selectedCity === cityIndex ? 1.0 : 0.65;
    });

    // Update point color with glowing effect for selected
    globe.pointColor((d: any) => {
      const cityIndex = typeof d.cityIndex === 'number' ? d.cityIndex : CITIES.findIndex((city) => city.id === d.id);
      const city = cityIndex >= 0 ? CITIES[cityIndex] : null;
      if (city && simulatedCityIds.has(city.id) && isSimulationActive) {
        return simulationNodeColor;
      }
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
      const arcIndex = typeof d.arcIndex === 'number' ? d.arcIndex : i;
      let baseStroke = focusedSimulation ? 0.22 : 0.34;
      
      // In high-load mode, vary thickness based on congestion
      if (STATE.simulationMode === 'high-load') {
        const conn = CONNECTIONS[arcIndex];
        if (conn) {
          // congestionScore 0-100 → thickness multiplier 0.8-1.8
          const congestionFactor = 0.8 + (conn.congestionScore / 100) * 1.0;
          baseStroke = baseStroke * congestionFactor;
        }
      } else if (isPacketLossMode) {
        baseStroke = 0.42;
      }
      
      if (STATE.selectedArc === arcIndex) {
        return focusedSimulation ? baseStroke + 0.35 : isPacketLossMode ? baseStroke + 0.44 : baseStroke + 0.22;
      }
      if (previewFocus?.type === 'fiber' && previewFocus.arcIndex === arcIndex) {
        return baseStroke + 0.16;
      }
      if (activeDecisionImpact && affectedArcIndices.has(arcIndex)) return baseStroke + 0.28;
      return baseStroke;
    });

    let dashLength = activeDecisionImpact
      ? activeDecisionImpact.mode === 'cable-cut'
        ? 0.08
        : activeDecisionImpact.mode === 'packet-loss'
          ? 0.14
          : 0.28
      : isCableCutMode
        ? 0.12
        : isPacketLossMode
          ? 0.08
          : 0.25;
    let dashGap = activeDecisionImpact
      ? activeDecisionImpact.mode === 'high-load'
        ? 0.45
        : 1.2
      : isCableCutMode
        ? 1.2
        : isPacketLossMode
          ? 1.9
          : 0.75;
    let dashAnimateBase = activeDecisionImpact
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

    if (focusedSimulation) {
      dashLength = 1;
      dashGap = 0;
      dashAnimateBase = 0;
    }

    globe
      .arcDashLength(dashLength)
      .arcDashGap(dashGap)
      .arcDashAnimateTime(() => (focusedSimulation ? 0 : dashAnimateBase + Math.random() * dashAnimateJitter));

    // Update arc color with opacity based on selection state AND simulation mode
    globe.arcColor((d: any, i: number) => {
      const arcIndex = typeof d.arcIndex === 'number' ? d.arcIndex : i;
      let baseColor = d.color;
      let useFlickerOpacity = false;

      if (focusedSimulation && STATE.selectedArc === arcIndex) {
        baseColor = '#f7c955';
      }
      if (previewFocus?.type === 'fiber' && previewFocus.arcIndex === arcIndex) {
        return previewFocus.accent;
      }

      // Override base color based on simulation mode
      if (STATE.simulationMode === 'high-load') {
        baseColor = '#7e8694';
        if (STATE.selectedArc === arcIndex) {
          baseColor = '#ffb347'; // Amber highlight
        }
      } else if (isPacketLossMode) {
        baseColor = '#8594a3';
        if (STATE.selectedArc === arcIndex) {
          baseColor = '#ff5b5b'; // Strong red highlight
        }
        useFlickerOpacity = true;
      } else if (isCableCutMode) {
        baseColor = '#7a8694';
        if (STATE.selectedArc === arcIndex) {
          baseColor = '#ff3333'; // Bright Red highlight
        }
      }

      // If an arc is selected, dim all others significantly (2% opacity for focus)
      if (STATE.selectedArc !== null) {
        if (STATE.selectedArc === arcIndex) {
          return baseColor; // Full opacity for selected arc
        }
        return hexToRgba(baseColor, isPacketLossMode ? 0.08 : 0.02);
      }



      // If a city is selected, dim arcs not connected to it
      if (STATE.selectedCity !== null) {
        if (isArcConnectedToCity(arcIndex, STATE.selectedCity)) {
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
        : CITIES.filter((city) => highlightedCityIds.has(city.id) || simulatedCityIds.has(city.id));

    globe
      .ringsData(ringsData)
      .ringColor(() => {
        if (routeSourceCityId) return 'rgba(251, 191, 36, 0.76)';
        if (decisionAccentColor) return hexToRgba(decisionAccentColor, 0.6);
        if (simulatedConnection) {
          if (STATE.simulationMode === 'high-load') return 'rgba(251, 191, 36, 0.72)';
          if (STATE.simulationMode === 'packet-loss') return 'rgba(248, 113, 113, 0.72)';
          if (STATE.simulationMode === 'cable-cut') return 'rgba(239, 68, 68, 0.8)';
        }
        return ringColor;
      })
      .ringMaxRadius(activeDecisionImpact ? 3.4 : simulatedConnection || routeSourceCityId ? 3.1 : 2)
      .ringPropagationSpeed(activeDecisionImpact ? 3 : simulatedConnection ? 2.8 : 2)
      .ringRepeatPeriod(activeDecisionImpact ? 900 : simulatedConnection ? 760 : 1500);

    // Packet loss mode: trigger periodic re-render for flickering effect
    if (STATE.simulationMode === 'packet-loss') {
      // Flickering handled by random opacity in arcColor above
      // Could add periodic re-render here if needed for animation
    }

    // Cable cut mode: add labels/markers for selected arc
    const labelsData: Array<{
      lat: number;
      lng: number;
      text: string;
      color: string;
      size: number;
      altitude?: number;
      isCritical?: boolean;
    }> = [];

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
      if (STATE.selectedArc !== null) {
        const lossArc = arcsDataRef.current.find((arc) => arc.arcIndex === STATE.selectedArc);
        if (lossArc) {
          const midLat = (lossArc.startLat + lossArc.endLat) / 2;
          const midLng = (lossArc.startLng + lossArc.endLng) / 2;
          labelsData.push(
            {
              lat: midLat,
              lng: midLng,
              text: '↺',
              color: '#ffe4e6',
              size: 2.9,
              altitude: 0.2,
              isCritical: true,
            },
            {
              lat: midLat + 0.75,
              lng: midLng,
              text: 'Retry',
              color: '#fecaca',
              size: 1.28,
              altitude: 0.17,
              isCritical: true,
            },
          );
        }
      } else {
        const step = Math.max(1, Math.floor(arcsDataRef.current.length / 5));
        for (let i = 0; i < arcsDataRef.current.length && labelsData.length < 5; i += step) {
          const arc = arcsDataRef.current[i];
          labelsData.push({
            lat: (arc.startLat + arc.endLat) / 2,
            lng: (arc.startLng + arc.endLng) / 2,
            text: '↺',
            color: '#fca5a5',
            size: 1.12,
          });
        }
      }
    }

    if (isCableCutMode && arcsDataRef.current.length > 0) {
      if (STATE.selectedArc !== null) {
        const cutArc = arcsDataRef.current.find((arc) => arc.arcIndex === STATE.selectedArc);
        const conn = CONNECTIONS[STATE.selectedArc];
        if (!cutArc) return;
        const cableCutReasonText = getCableCutReasonText(scenarioStory, conn);
        const interpolateLatLng = (t: number) => interpolateGreatCircle(cutArc.startLat, cutArc.startLng, cutArc.endLat, cutArc.endLng, t);
        const inboundBlock = interpolateLatLng(0.44);
        const outboundBlock = interpolateLatLng(0.56);
        const tooltipPoint = interpolateLatLng(0.5);
        
        dynamicHtmlElements.push(
          {
            type: 'cable-cut-x',
            lat: inboundBlock.lat,
            lng: inboundBlock.lng,
            direction: 'inbound',
          },
          {
            type: 'cable-cut-x',
            lat: outboundBlock.lat,
            lng: outboundBlock.lng,
            direction: 'outbound',
          },
          {
            type: 'cable-cut-tooltip',
            lat: tooltipPoint.lat,
            lng: tooltipPoint.lng,
            text: 'Cable break',
            detail: cableCutReasonText,
          }
        );
        
        // Add backup route indicator when alternatives exist
        if (conn && conn.backupRouteIds.length > 0) {
          labelsData.push({
            lat: outboundBlock.lat + 1.08,
            lng: outboundBlock.lng,
            text: 'Reroute',
            color: '#8ba389',
            size: 0.85,
            altitude: 0.12,
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
    const cityLabelDots = layers.rings ? buildVisibleCityPoints().map((city: any) => {
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
    }) : [];
    
    const finalLabelsData = [...labelsData, ...cityLabelDots];

    globe
      .labelsData(finalLabelsData)
      .labelLat('lat')
      .labelLng('lng')
      .labelText('text')
      .labelSize('size')
      .labelColor('color')
      .labelDotRadius((d: any) => {
        if (d.isCityDot) {
          const city = CITIES[d.cityIndex];
          return STATE.selectedCity === d.cityIndex || routeSourceCityId === city?.id ? 1.2 : 0.8;
        }
        if (d.isCritical) return 0;
        return activeDecisionImpact ? 0.65 : 0.3;
      })
      .labelAltitude((d: any) => {
        if (d.isCityDot) return 0.005;
        if (typeof d.altitude === 'number') return d.altitude;
        return activeDecisionImpact ? 0.08 : 0.03;
      })
      .htmlAltitude((d: any) => {
        if (d.type === 'cable-cut-x') return 0.012;
        if (d.type === 'cable-cut-tooltip') return 0.018;
        if (d.type === 'component-preview') return d.previewType === 'fiber' ? 0.28 : d.previewType === 'satellite' ? 0.18 : 0.045;
        return d.type === 'company-hub' ? 0.03 : (d.type === 'satellite' ? 0.18 : 0.015);
      })
      .htmlElementsData(dynamicHtmlElements)
      .onLabelClick((d: any) => {
        if (d.isCityDot) {
          const clickedIndex = d.cityIndex;
          if (clickedIndex !== -1) {
            const clickedCity = CITIES[clickedIndex];
            if (hintVisible) setHintVisible(false);

            if (routeSourceCityId && routeSourceCityId !== clickedCity.id) {
              const routeArcIndex = ensureDirectConnection(routeSourceCityId, clickedCity.id);
              if (routeArcIndex !== null) {
                STATE.selectedCity = null;
                STATE.selectedArc = routeArcIndex;
                setRouteSourceCityId(null);
                setVisibleCityIds((prev) => Array.from(new Set([...prev, routeSourceCityId, clickedCity.id])));
                onCitySelect(null);
                onArcSelect(routeArcIndex);
                console.log('🖱️ Route selected:', routeSourceCityId, '→', clickedCity.id, '| Arc:', routeArcIndex);
                render();
                return;
              }
            }

            const nextSourceId = routeSourceCityId === clickedCity.id ? null : clickedCity.id;
            setRouteSourceCityId(nextSourceId);
            STATE.selectedCity = nextSourceId ? clickedIndex : null;
            STATE.selectedArc = null;
            onArcSelect(null);
            onCitySelect(STATE.selectedCity);
            console.log('🖱️ City source selected:', clickedCity.name, '| Index:', clickedIndex);
            render();
          }
        }
      })
      .onLabelHover((label: any) => {
        if (globeRef.current && globeRef.current.controls()) {
          // Pause rotation if hovering a label OR if a city/arc is already selected
          globeRef.current.controls().autoRotate =
            !label &&
            STATE.selectedCity === null &&
            STATE.selectedArc === null &&
            !rotationLockedRef.current;
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

    const arcsData = CONNS.map(([i, j, col], arcIndex) => ({
      startLat: CITIES[i].lat,
      startLng: CITIES[i].lng,
      endLat: CITIES[j].lat,
      endLng: CITIES[j].lng,
      color: RESOLVED_ARC_COLORS[col],
      arcIndex,
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
      // Underwater/Terrestrial Backbone (Paths)
      .pathsData(CONNS.filter(([i, j]) => haversineKm(CITIES[i].lat, CITIES[i].lng, CITIES[j].lat, CITIES[j].lng) > 3500).map(([i, j]) => ({
        coords: [
          [CITIES[i].lat, CITIES[i].lng],
          [CITIES[j].lat, CITIES[j].lng]
        ]
      })))
      .pathPoints('coords')
      .pathPointLat((p: any) => p[0])
      .pathPointLng((p: any) => p[1])
      .pathColor(() => {
        if (STATE.simulationMode === 'packet-loss') return 'rgba(248, 113, 113, 0.26)';
        if (STATE.simulationMode === 'high-load') return 'rgba(251, 191, 36, 0.38)';
        if (STATE.simulationMode === 'cable-cut') return 'rgba(248, 113, 113, 0.34)';
        return 'rgba(234, 179, 8, 0.78)';
      })
      .pathStroke(1.2)
      // Arcs / streams
      .arcsData(arcsData)
      .arcStartLat('startLat')
      .arcStartLng('startLng')
      .arcEndLat('endLat')
      .arcEndLng('endLng')
      .arcColor('color')
      .arcAltitude(0.28)
      .arcStroke(0.34)
      .arcDashLength(() => {
        if (STATE.simulationMode === 'high-load') return 0.05; // Dense bunched up packets
        if (STATE.simulationMode === 'packet-loss') return 0.01; // Broken sparse dots
        return 0.18; // Normal
      })
      .arcDashGap(() => {
        if (STATE.simulationMode === 'high-load') return 0.08; // Close together (traffic jam)
        if (STATE.simulationMode === 'packet-loss') return 1.8; // Dropped / huge gaps
        return 1.1; // Normal
      })
      .arcDashAnimateTime(() => {
        const base = 2400 + Math.random() * 800;
        if (STATE.simulationMode === 'high-load') return base * 4.5; // Slow down massively
        if (STATE.simulationMode === 'packet-loss') return base * 0.4; // Frantic retries
        return base;
      })
      .arcsTransitionDuration(0)
      .onArcClick((arc: any, event: any, { lat, lng, altitude }: any) => {
        // Find the index of the clicked arc in CONNS array
        const clickedIndex = typeof arc.arcIndex === 'number'
          ? arc.arcIndex
          : arcsDataRef.current.findIndex(a =>
            a.startLat === arc.startLat &&
            a.startLng === arc.startLng &&
            a.endLat === arc.endLat &&
            a.endLng === arc.endLng
          );

        if (clickedIndex !== -1) {
          STATE.selectedArc = STATE.selectedArc === clickedIndex ? null : clickedIndex;
          STATE.selectedCity = null; // Deselect city when arc is selected
          setRouteSourceCityId(null);
          onArcSelect(STATE.selectedArc);
          onCitySelect(null);
          console.log('🖱️ Arc clicked:', CONNS[clickedIndex], '| Index:', clickedIndex);

          // TODO: SERVICE - Fetch real arc/route metadata
          render();
        }
      })
      // Rings / region borders for cities
      .ringsData(visibleCityPoints)
      .ringLat('lat')
      .ringLng('lng')
      .ringColor((d: any) => {
        const cityIndex = typeof d.cityIndex === 'number' ? d.cityIndex : CITIES.findIndex((city) => city.id === d.id);
        if (routeSourceCityId === d.id) return 'rgba(251, 191, 36, 0.9)';
        return STATE.selectedCity === cityIndex ? 'rgba(56, 189, 248, 0.9)' : 'rgba(56, 189, 248, 0.45)';
      })
      .ringMaxRadius((d: any) => {
        const cityIndex = typeof d.cityIndex === 'number' ? d.cityIndex : CITIES.findIndex((city) => city.id === d.id);
        return STATE.selectedCity === cityIndex || routeSourceCityId === d.id ? 2.6 : 1.6;
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
            width: 24px;
            height: 24px;
            border-radius: 6px;
            background: #ffffff;
            border: 1px solid rgba(0,0,0,0.1);
            box-shadow: 0 2px 6px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3px;
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
        } else if (d.type === 'cable-cut-x') {
          const wrap = document.createElement('div');
          wrap.style.cssText = `
            color: #ff3434;
            font-size: 34px;
            font-weight: 900;
            font-family: var(--sans);
            line-height: 1;
            text-shadow: 0 0 8px rgba(255, 52, 52, 0.95), 0 2px 3px rgba(0, 0, 0, 0.95);
            transform: translate(-50%, -50%);
            user-select: none;
            pointer-events: none;
          `;
          wrap.textContent = '×';
          return wrap;
        } else if (d.type === 'cable-cut-tooltip') {
          const wrap = document.createElement('div');
          wrap.style.cssText = `
            background: rgba(15, 23, 42, 0.78);
            border: 1px solid rgba(248, 113, 113, 0.58);
            border-radius: 999px;
            padding: 4px 8px;
            color: #fecaca;
            font-family: var(--sans);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.02em;
            text-align: center;
            transform: translate(-50%, calc(-100% - 22px));
            box-shadow: 0 4px 10px rgba(0,0,0,0.28);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            user-select: none;
            pointer-events: none;
            position: relative;
            white-space: nowrap;
          `;
          const pointer = document.createElement('div');
          pointer.style.cssText = `
            content: '';
            position: absolute;
            bottom: -5px;
            left: 50%;
            transform: translateX(-50%);
            border-width: 5px 5px 0;
            border-style: solid;
            border-color: rgba(248, 113, 113, 0.58) transparent transparent transparent;
          `;
          const pointerInner = document.createElement('div');
          pointerInner.style.cssText = `
            content: '';
            position: absolute;
            bottom: -3px;
            left: 50%;
            transform: translateX(-50%);
            border-width: 4px 4px 0;
            border-style: solid;
            border-color: rgba(15, 23, 42, 0.78) transparent transparent transparent;
          `;
          wrap.textContent = d.text;
          wrap.appendChild(pointer);
          wrap.appendChild(pointerInner);
          return wrap;
        } else if (d.type === 'component-preview') {
          const wrap = document.createElement('div');
          const accent = d.accent ?? '#67e8f9';
          const ringSize = d.previewType === 'fiber' ? 42 : 54;
          wrap.style.cssText = `
            position: relative;
            transform: translate(-50%, -50%);
            pointer-events: none;
            user-select: none;
            font-family: var(--sans);
          `;

          const ring = document.createElement('div');
          ring.style.cssText = `
            width: ${ringSize}px;
            height: ${ringSize}px;
            border-radius: 999px;
            border: 2px solid ${accent};
            box-shadow: 0 0 18px ${accent}, inset 0 0 14px rgba(255,255,255,0.16);
            animation: componentPreviewPulse 1.25s ease-in-out infinite;
          `;

          const arrow = document.createElement('div');
          arrow.style.cssText = `
            position: absolute;
            left: 50%;
            top: -24px;
            width: 2px;
            height: 28px;
            transform: translateX(-50%);
            background: linear-gradient(180deg, transparent, ${accent});
            box-shadow: 0 0 10px ${accent};
          `;

          const label = document.createElement('div');
          label.style.cssText = `
            position: absolute;
            left: 50%;
            top: -48px;
            transform: translateX(-50%);
            padding: 4px 8px;
            border-radius: 999px;
            background: rgba(2, 6, 23, 0.78);
            color: ${accent};
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.03em;
            white-space: nowrap;
            box-shadow: inset 0 0 0 1px ${accent}, 0 6px 14px rgba(0,0,0,0.28);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
          `;
          label.textContent = d.label ?? 'Preview';

          wrap.appendChild(ring);
          wrap.appendChild(arrow);
          wrap.appendChild(label);
          return wrap;
        } else if (d.type === 'satellite') {
          const wrap = document.createElement('div');
          wrap.style.cssText = `
            display: flex;
            align-items: center;
            gap: 4px;
            pointer-events: none;
            user-select: none;
          `;
          
          const icon = document.createElement('div');
          icon.style.cssText = `
            width: 20px;
            height: 20px;
            opacity: 0.9;
            filter: drop-shadow(0 0 4px #0ea5e9);
          `;
          const img = document.createElement('img');
          img.src = `${import.meta.env.BASE_URL}asset/starlink.svg`;
          img.style.cssText = 'width: 100%; height: 100%; display: block; object-fit: contain; filter: invert(1);';
          icon.appendChild(img);

          const label = document.createElement('div');
          label.style.cssText = `
            font-family: monospace;
            font-size: 8px;
            font-weight: bold;
            color: #38bdf8;
            background: rgba(15, 23, 42, 0.7);
            padding: 2px 4px;
            border-radius: 3px;
            border: 1px solid rgba(56, 189, 248, 0.3);
          `;
          label.textContent = 'SAT';

          wrap.appendChild(icon);
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
      if (rotationLockedRef.current) {
        rotationLockedRef.current = false;
        const controls = globeRef.current?.controls?.();
        if (controls && STATE.selectedCity === null && STATE.selectedArc === null) {
          controls.autoRotate = true;
        }
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
      .ringsData(layers.rings ? buildVisibleCityPoints() : [])
      .htmlElementsData(buildVisibleOverlayData());
    render();
  }, [visibleCityIds, layers.rings]);

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

  const simulationRouteCities =
    selectedArc !== null
      ? getRouteCities()
      : null;
  const routeSourceCity = routeSourceCityId
    ? CITIES.find((city) => city.id === routeSourceCityId) ?? null
    : null;

  const legendItems = getGlobeLegendItems(simulationMode, decisionImpact);

  const closeCityDialog = () => {
    STATE.selectedCity = null;
    STATE.selectedArc = null;
    setRouteSourceCityId(null);
    setPreviewFocus(null);
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
    setRouteSourceCityId(null);
    setPreviewFocus(null);
    onResetAll?.();
  };


  return (
    <div className="globe-section">
      <div ref={containerRef} className="globe-container"></div>
      <button className="globe-reset-all-btn" onClick={handleResetAll}>
        Reset view
      </button>

      {layers.packets && <PacketDots globeRef={globeRef} />}
      {hintVisible && (
        <div className="globe-hint">
          Tap any city to begin
        </div>
      )}
      {routeSourceCity && selectedArc === null && (
        <div className="globe-route-prompt">
          <span>
            Source selected: <strong>{routeSourceCity.name}</strong>. Choose a destination city to activate traffic.
          </span>
          <button
            type="button"
            onClick={() => {
              setRouteSourceCityId(null);
              STATE.selectedCity = null;
              onCitySelect(null);
              render();
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {decisionBadge && (
        <div className={`globe-decision-badge globe-decision-badge--${decisionBadge.tone}`}>
          <div className="globe-sim-badge-title">{decisionBadge.title}</div>
          <div className="globe-sim-badge-detail">{decisionBadge.detail}</div>
        </div>
      )}
      {inspectorData && (
        <div className="globe-inspector" role="dialog" aria-label={inspectorData.title}>
          <div
            className="globe-inspector-image"
            style={{ backgroundImage: `url('${inspectorData.imageUrl}')` }}
          >
            {inspectorData.logoUrl && (
              <div className="globe-inspector-logo-wrap">
                <img
                  className="globe-inspector-logo"
                  src={inspectorData.logoUrl}
                  alt={inspectorData.title}
                />
              </div>
            )}
          </div>
          <div className="globe-inspector-content">
            <div className="globe-inspector-eyebrow">{inspectorData.eyebrow}</div>
            <div className="globe-inspector-title">{inspectorData.title}</div>
            <p className="globe-inspector-body">{inspectorData.body}</p>
            <div className="globe-inspector-facts">
              {inspectorData.facts.map((fact) => (
                <div key={`${fact.label}-${fact.value}`} className="globe-inspector-fact">
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </div>
              ))}
            </div>
          </div>
          <button
            className="globe-inspector-close"
            type="button"
            onClick={closeInspector}
            aria-label="Close inspector"
          >
            ×
          </button>
        </div>
      )}
      {simulationRouteCities && (
        <div className="globe-sim-route">
          <div className="globe-sim-route-title">Active route</div>
          <div className="globe-sim-route-cards">
            {[simulationRouteCities.fromCity, simulationRouteCities.toCity].map((city) => (
              <div key={city.id} className="globe-sim-route-card">
                <div className="globe-sim-route-flag">
                  <img
                    src={flagImgUrl(city.countryCode)}
                    width={24}
                    height={18}
                    alt={city.countryCode}
                  />
                </div>
                <div className="globe-sim-route-meta">
                  <div className="globe-sim-route-name">
                    {new Intl.DisplayNames(['en'], { type: 'region' }).of(city.countryCode)}, {city.name}
                  </div>
                  <div className="globe-sim-route-note">{city.friendlyFact}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend + Layer Menus */}
      <div className="globe-top-tools">
        <DropdownMenu open={legendMenuOpen} onOpenChange={setLegendMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 text-slate-200 hover:bg-slate-800 hover:text-white"
              title="Show globe legend"
            >
              <Info className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="z-50 w-[360px] !p-0 border-none bg-transparent shadow-none"
          >
            <div className="globe-legend !relative !right-auto !bottom-auto !w-full !pointer-events-auto">
              <div className="globe-legend-title">Globe legend</div>
              <div
                className="globe-legend-tip"
                title="Open info cards from the globe or use this legend when small items are hard to click."
              >
                <span className="globe-legend-tip-icon">i</span>
                <span>Click fiber routes, company logos, or SAT markers to open component info cards.</span>
              </div>
              <div className="globe-legend-list">
                {legendItems.map((item) => (
                  <div key={item.id} className="globe-legend-row">
                    <div className="globe-legend-item">
                      <span className={`globe-legend-symbol globe-legend-symbol--${item.tone}`}>
                        {item.symbol}
                      </span>
                      <span className="globe-legend-text">{item.text}</span>
                    </div>
                    {legendInfoItemIds.has(item.id) && (
                      <button
                        type="button"
                        className="globe-legend-info-btn"
                        title={`Open info about ${item.text}`}
                        aria-label={`Open info about ${item.text}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openLegendComponentInfo(item.id);
                        }}
                      >
                        <Info className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu open={layerMenuOpen} onOpenChange={setLayerMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-slate-900/60 backdrop-blur-md border-slate-700/50 text-slate-200 hover:bg-slate-800 hover:text-white"
              title="Toggle view"
            >
              <Layers className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            side="bottom"
            sideOffset={10}
            className="z-50 w-[290px] !p-0 border-none bg-transparent shadow-none"
          >
            <div className="globe-legend !relative !right-auto !bottom-auto !w-full !pointer-events-auto">
              <div className="globe-legend-title">View Options</div>
              
              <div className="globe-legend-list">
                {[
                  { id: 'arcs', label: 'Network backbone', symbol: '—', tone: 'arc' },
                  { id: 'fibers', label: 'Subsea fiber', symbol: '-', tone: 'fiber' },
                  { id: 'packets', label: 'Data packets', symbol: '••', tone: 'packet' },
                  { id: 'rings', label: 'Internet hubs', symbol: '●', tone: 'hub' },
                  { id: 'hubs', label: 'Company datacenters', symbol: '🏢', tone: 'infra' },
                  { id: 'satellites', label: 'Starlink (LEO)', symbol: 'SAT', tone: 'sat' },
                ].map(layer => (
                  <DropdownMenuItem
                    key={layer.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      setLayers(prev => ({ ...prev, [layer.id]: !prev[layer.id] }));
                    }}
                    className="globe-legend-item !items-center !justify-between !bg-transparent !border-none !cursor-pointer focus:!bg-white/5 !rounded-md !p-1 !-m-1 transition-colors"
                  >
                    <div className="flex items-center gap-[8px]">
                      <span className={`globe-legend-symbol globe-legend-symbol--${layer.tone}`}>
                        {layer.symbol}
                      </span>
                      <span className="font-sans text-[12px] text-[var(--globe-overlay-text)]">
                        {layer.label}
                      </span>
                    </div>
                    <Switch 
                      checked={layers[layer.id as keyof typeof layers]}
                      onCheckedChange={() => {}} // Handled by DropdownMenuItem to prevent double toggle
                      className="pointer-events-none h-4 w-7 data-[state=checked]:bg-sky-500 data-[state=unchecked]:bg-[var(--globe-overlay-bg)] shadow-[inset_0_0_0_1px_var(--globe-overlay-border)] [&_[data-slot=switch-thumb]]:size-3 data-[state=checked]:[&_[data-slot=switch-thumb]]:translate-x-3 transition-colors"
                    />
                  </DropdownMenuItem>
                ))}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
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
