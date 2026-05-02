// Network data: cities, connections, and suggested questions

export type City = {
  id: string;
  name: string;
  flag: string;
  countryCode: string;
  lat: number;
  lng: number;
  region: string;
  hubTier: 1 | 2;
  fact: string;
  friendlyFact: string;
  heroStat: string;
};

export type Connection = {
  id: string;
  from: string;
  to: string;
  latency: number;
  cable: string;
  type: 'Subsea cable' | 'Land cable';
  bandwidth: string;
  distanceKm: number;
  depthM: number;
  blinkComparison: string;
  funFact: string;
  riskType: 'anchor' | 'earthquake' | 'congestion' | 'wireless' | 'maintenance';
  backupRouteIds: string[];
  congestionScore: number;
  recoveryHint: string;
};

export const CITIES: City[] = [
  { id: 'sgp', name: 'Singapore',   lat: 1.35,   lng: 103.82,
    region: 'Southeast Asia', hubTier: 1,
    fact: 'Home to Equinix SG — one of Asia\'s most important internet exchange points.',
    flag: '🇸🇬',
    countryCode: 'SG',
    friendlyFact: 'Singapore is a tiny island where many global internet routes meet before spreading across Asia.',
    heroStat: 'Connects major traffic between Asia, Europe, and North America' },

  { id: 'tok', name: 'Tokyo',       lat: 35.68,  lng: 139.69,
    region: 'East Asia',      hubTier: 1,
    fact: 'Connected to the US via the FASTER and JUPITER transpacific cable systems.',
    flag: '🇯🇵',
    countryCode: 'JP',
    friendlyFact: 'Tokyo is one of the fastest digital crossroads in Asia for games, video, and everyday apps.',
    heroStat: 'Hosts one of the world\'s busiest metro fiber networks' },

  { id: 'lon', name: 'London',      lat: 51.51,  lng: -0.13,
    region: 'Europe',         hubTier: 1,
    fact: 'LINX in London is one of the largest internet exchanges in the world.',
    flag: '🇬🇧',
    countryCode: 'GB',
    friendlyFact: 'London is a major meeting point where traffic from Europe and across the Atlantic swaps routes quickly.',
    heroStat: 'Links Europe with North America through multiple high-capacity routes' },

  { id: 'nyc', name: 'New York',    lat: 40.71,  lng: -74.01,
    region: 'North America',  hubTier: 1,
    fact: 'Landing point for major transatlantic cables including AEC-1 and TAT-14.',
    flag: '🇺🇸',
    countryCode: 'US',
    friendlyFact: 'New York is a huge digital doorway where information enters and leaves the US east coast.',
    heroStat: 'Handles massive transatlantic traffic every second' },

  { id: 'lax', name: 'Los Angeles', lat: 34.05,  lng: -118.24,
    region: 'North America',  hubTier: 1,
    fact: 'Primary US landing point for transpacific cables connecting Asia to the Americas.',
    flag: '🇺🇸',
    countryCode: 'US',
    friendlyFact: 'Los Angeles is a key west-coast launch point for internet routes crossing the Pacific Ocean.',
    heroStat: 'Connects North America to Asia over multiple ocean cable systems' },

  { id: 'syd', name: 'Sydney',      lat: -33.87, lng: 151.21,
    region: 'Oceania',        hubTier: 2,
    fact: 'Australia\'s primary internet gateway, connected via the Southern Cross cable.',
    flag: '🇦🇺',
    countryCode: 'AU',
    friendlyFact: 'Sydney is Australia\'s main internet gateway to the rest of the world.',
    heroStat: 'Carries much of Australia\'s international internet traffic' },

  { id: 'mum', name: 'Mumbai',      lat: 19.08,  lng: 72.88,
    region: 'South Asia',     hubTier: 2,
    fact: 'Key landing point for SEA-ME-WE cables linking Europe to Asia.',
    flag: '🇮🇳',
    countryCode: 'IN',
    friendlyFact: 'Mumbai helps connect India to Europe, the Middle East, and Southeast Asia through major cable landings.',
    heroStat: 'One of India\'s most important international cable gateways' },

  { id: 'dxb', name: 'Dubai',       lat: 25.20,  lng: 55.27,
    region: 'Middle East',    hubTier: 2,
    fact: 'Critical transit hub connecting African, Asian, and European networks.',
    flag: '🇦🇪',
    countryCode: 'AE',
    friendlyFact: 'Dubai sits in a strategic location that helps internet routes pass between continents.',
    heroStat: 'Bridges traffic flows between Europe, Asia, and Africa' },

  { id: 'fra', name: 'Frankfurt',   lat: 50.11,  lng: 8.68,
    region: 'Europe',         hubTier: 1,
    fact: 'DE-CIX Frankfurt is the world\'s largest internet exchange by peak traffic.',
    flag: '🇩🇪',
    countryCode: 'DE',
    friendlyFact: 'Frankfurt is a central handoff point that keeps Europe\'s internet routes short and fast.',
    heroStat: 'Home to DE-CIX, the world\'s largest internet exchange by peak traffic' },

  { id: 'sao', name: 'São Paulo',   lat: -23.55, lng: -46.63,
    region: 'South America',  hubTier: 2,
    fact: 'Latin America\'s largest internet hub, home to IX.br exchange point.',
    flag: '🇧🇷',
    countryCode: 'BR',
    friendlyFact: 'São Paulo is the biggest internet meeting point in South America for local and global routes.',
    heroStat: 'Anchors the largest internet hub in Latin America' },
];

export const CONNECTIONS: Connection[] = [
  // Transpacific
  { id: 'lax-tok-faster', from: 'lax', to: 'tok', latency: 108, cable: 'FASTER',         type: 'Subsea cable', bandwidth: '60 Tbps', distanceKm: 9000,  depthM: 4500, blinkComparison: 'about as fast as a camera click 📸',              funFact: 'FASTER was built by a consortium including Google and links Japan directly to the US west coast.', riskType: 'earthquake', backupRouteIds: ['tok-sgp-jupiter', 'lax-sgp-sea-us'], congestionScore: 35, recoveryHint: 'Major rupture requires new cable installation; traffic reroutes through Southeast Asia hub (3-5 hours typical).' },
  { id: 'lax-sgp-sea-us', from: 'lax', to: 'sgp', latency: 170, cable: 'SEA-US',         type: 'Subsea cable', bandwidth: '24 Tbps', distanceKm: 14800, depthM: 4700, blinkComparison: 'still faster than you can say hello 💬',      funFact: 'SEA-US is part of a modern Pacific route designed to improve resilience for Southeast Asia traffic.', riskType: 'anchor', backupRouteIds: ['lax-tok-faster', 'syd-sgp-indigo'], congestionScore: 28, recoveryHint: 'Ship anchor damage typically fixed within hours; temporary reroute through nearby cables.' },
  { id: 'syd-lax-sc', from: 'syd', to: 'lax', latency: 152, cable: 'Southern Cross', type: 'Subsea cable', bandwidth: '20 Tbps', distanceKm: 12500, depthM: 4200, blinkComparison: 'still faster than you can say hello 💬',      funFact: 'The Southern Cross network uses diverse paths so outages on one segment do not isolate Australia.', riskType: 'earthquake', backupRouteIds: ['syd-tok-bass', 'syd-sgp-indigo'], congestionScore: 22, recoveryHint: 'Pacific earthquake damage needs cable repair ship dispatch; may take 2-4 weeks for major break.' },
  { id: 'tok-sgp-jupiter', from: 'tok', to: 'sgp', latency: 71,  cable: 'JUPITER',        type: 'Subsea cable', bandwidth: '60 Tbps', distanceKm: 5300,  depthM: 3500, blinkComparison: 'about as fast as a camera click 📸',              funFact: 'JUPITER-class systems use advanced optical upgrades to keep adding capacity without replacing the whole cable.', riskType: 'congestion', backupRouteIds: ['tok-mum-smew4', 'sgp-mum-smew4'], congestionScore: 78, recoveryHint: 'High traffic during peak hours (6-10pm JST); offload to regional hubs or request lower-priority traffic defer.' },

  // Transatlantic
  { id: 'nyc-lon-aec1', from: 'nyc', to: 'lon', latency: 75,  cable: 'AEC-1',          type: 'Subsea cable', bandwidth: '8.8 Tbps', distanceKm: 5600,  depthM: 3800, blinkComparison: 'about as fast as a camera click 📸',              funFact: 'Modern Atlantic cables are laid with repeater stations that boost light signals roughly every 60–100 km.', riskType: 'anchor', backupRouteIds: ['nyc-fra-tat14', 'lon-fra-terrestrial'], congestionScore: 45, recoveryHint: 'Anchor damage typically repaired within 24 hours by local repair services; very common in shipping lanes.' },
  { id: 'nyc-fra-tat14', from: 'nyc', to: 'fra', latency: 89,  cable: 'TAT-14',         type: 'Subsea cable', bandwidth: '3.2 Tbps', distanceKm: 6500,  depthM: 3500, blinkComparison: 'about as fast as a camera click 📸',              funFact: 'TAT-14 was one of the first big ring-style Atlantic systems, helping reroute traffic during maintenance.', riskType: 'maintenance', backupRouteIds: ['nyc-lon-aec1', 'lon-fra-terrestrial'], congestionScore: 15, recoveryHint: 'Planned maintenance windows scheduled quarterly; traffic preemptively shifted 48 hours before.' },
  { id: 'lon-fra-terrestrial', from: 'lon', to: 'fra', latency: 12,  cable: 'Terrestrial',    type: 'Land cable',   bandwidth: '100+ Tbps', distanceKm: 650,   depthM: 0,    blinkComparison: 'faster than a blink ⚡',                          funFact: 'This route combines dense terrestrial fiber corridors and is one of Europe\'s busiest data paths.', riskType: 'congestion', backupRouteIds: ['nyc-lon-aec1', 'dxb-fra-smw5'], congestionScore: 88, recoveryHint: 'Peak congestion 8am-6pm CET from local trading floors; capacity upgrades ongoing.' },

  // Asia–Europe
  { id: 'sgp-mum-smew4', from: 'sgp', to: 'mum', latency: 50,  cable: 'SEA-ME-WE 4',   type: 'Subsea cable', bandwidth: '1.28 Tbps', distanceKm: 5000,  depthM: 3200, blinkComparison: 'about as fast as a camera click 📸',              funFact: 'SEA-ME-WE 4 spans from Southeast Asia to Europe and has long served as a backbone route.', riskType: 'wireless', backupRouteIds: ['sgp-dxb-flag', 'tok-sgp-jupiter'], congestionScore: 32, recoveryHint: 'Tropical storms in Indian Ocean cause signal degradation (monsoon season Jun-Oct); reroute advised.' },
  { id: 'mum-dxb-smew5', from: 'mum', to: 'dxb', latency: 18,  cable: 'SEA-ME-WE 5',   type: 'Subsea cable', bandwidth: '24 Tbps',  distanceKm: 2200,  depthM: 2600, blinkComparison: 'faster than a blink ⚡',                          funFact: 'SEA-ME-WE 5 added newer design capacity to handle rapid growth between South Asia and the Gulf.', riskType: 'anchor', backupRouteIds: ['sgp-mum-smew4', 'dxb-lon-flag'], congestionScore: 38, recoveryHint: 'Common anchorage point for merchant ships; damage repair within 12-48 hours typical.' },
  { id: 'dxb-lon-flag', from: 'dxb', to: 'lon', latency: 96,  cable: 'FLAG',           type: 'Subsea cable', bandwidth: '10 Tbps',  distanceKm: 7000,  depthM: 3000, blinkComparison: 'about as fast as a camera click 📸',              funFact: 'FLAG was one of the earliest very-long global fiber systems linking Europe and Asia at scale.', riskType: 'earthquake', backupRouteIds: ['sgp-mum-smew4', 'dxb-fra-smw5'], congestionScore: 29, recoveryHint: 'Red Sea tectonic zone; earthquakes can disrupt; reroute available via Middle East terrestrial.' },
  { id: 'lon-sgp-smew3', from: 'lon', to: 'sgp', latency: 170, cable: 'SEA-ME-WE 3',   type: 'Subsea cable', bandwidth: '960 Gbps', distanceKm: 10800, depthM: 3400, blinkComparison: 'still faster than you can say hello 💬',      funFact: 'SEA-ME-WE 3 stretches roughly 39,000 km end-to-end, making it one of the longest submarine cable systems built.', riskType: 'maintenance', backupRouteIds: ['lon-fra-terrestrial', 'sgp-mum-smew4'], congestionScore: 18, recoveryHint: 'Older system; periodic maintenance windows; traffic shifted proactively to newer cables.' },

  // Americas
  { id: 'nyc-sao-seabras1', from: 'nyc', to: 'sao', latency: 120, cable: 'SEABRAS-1',     type: 'Subsea cable', bandwidth: '72 Tbps',  distanceKm: 7600,  depthM: 4200, blinkComparison: 'about as fast as a camera click 📸',              funFact: 'Seabras-1 is one of the first direct modern links between the New York area and São Paulo area.', riskType: 'anchor', backupRouteIds: ['lax-sao-pan-am', 'nyc-lon-aec1'], congestionScore: 41, recoveryHint: 'South Atlantic shipping lanes; anchor damage requires specialized repair vessel; 24-48 hour fix.' },
  { id: 'lax-sao-pan-am', from: 'lax', to: 'sao', latency: 180, cable: 'Pan-Am',        type: 'Subsea cable', bandwidth: '24 Tbps',  distanceKm: 10200, depthM: 4000, blinkComparison: 'still faster than you can say hello 💬',      funFact: 'Pan-American cable corridors connect west coast and Latin American landing points for route diversity.', riskType: 'earthquake', backupRouteIds: ['nyc-sao-seabras1', 'syd-lax-sc'], congestionScore: 26, recoveryHint: 'Pacific/Pacific-Atlantic juncture; seismic activity; earthquake ruptures rare but catastrophic.' },

  // Oceania
  { id: 'syd-sgp-indigo', from: 'syd', to: 'sgp', latency: 98,  cable: 'Indigo-West',   type: 'Subsea cable', bandwidth: '36 Tbps',  distanceKm: 6300,  depthM: 3800, blinkComparison: 'about as fast as a camera click 📸',              funFact: 'Indigo systems were designed with open-cable technology so operators can upgrade equipment over time.', riskType: 'wireless', backupRouteIds: ['syd-tok-bass', 'syd-lax-sc'], congestionScore: 30, recoveryHint: 'Tropical cyclone season (Dec-Mar) causes intermittent signal loss; automatic failover triggered.' },
  { id: 'syd-tok-bass', from: 'syd', to: 'tok', latency: 108, cable: 'BASS',          type: 'Subsea cable', bandwidth: '40 Tbps',  distanceKm: 7800,  depthM: 4300, blinkComparison: 'about as fast as a camera click 📸',              funFact: 'This Pacific corridor helps reduce dependency on a single northbound route out of Australia.', riskType: 'earthquake', backupRouteIds: ['syd-lax-sc', 'syd-sgp-indigo'], congestionScore: 24, recoveryHint: 'Trans-Tasman and Southwest Pacific seismic zones; rupture repair can take 3-6 weeks.' },

  // Middle East–Europe
  { id: 'dxb-fra-smw5', from: 'dxb', to: 'fra', latency: 55,  cable: 'SMW-5',         type: 'Subsea cable', bandwidth: '24 Tbps',  distanceKm: 4800,  depthM: 2500, blinkComparison: 'about as fast as a camera click 📸',              funFact: 'SMW-5 includes multiple landing branches so traffic can be redistributed if one segment has issues.', riskType: 'anchor', backupRouteIds: ['dxb-lon-flag', 'lon-fra-terrestrial'], congestionScore: 36, recoveryHint: 'Red Sea and Mediterranean shipping corridors; anchor damage common; 12-24 hour typical repair.' },
];

export const CHIP_QUESTIONS: Record<string, string[]> = {
  sgp: ['Why is Singapore so important?', 'What cables connect here?', 'How fast can I reach other cities?'],
  tok: ['Why is Tokyo so connected?', 'What\'s special about this hub?', 'How does Japan connect to the world?'],
  lon: ['Why is London a big hub?', 'What\'s an internet exchange?', 'How does data cross the ocean?'],
  nyc: ['Why is New York so important?', 'What cables land here?', 'How fast is transatlantic internet?'],
  lax: ['Why does LA connect to Asia?', 'What\'s the transpacific cable?', 'How long to reach Tokyo?'],
  syd: ['How is Australia connected?', 'Why is internet sometimes slow here?', 'What cables reach Australia?'],
  mum: ['Why does Mumbai matter?', 'What cables land here?', 'How does India connect to Europe?'],
  dxb: ['Why is Dubai a transit hub?', 'What\'s special about this location?', 'How does it connect continents?'],
  fra: ['Why is Frankfurt so big?', 'What\'s special about this hub?', 'How does Europe route traffic?'],
  sao: ['How is South America connected?', 'Why is São Paulo important?', 'What cables reach here?'],
  default: ['How does internet travel?', 'What are submarine cables?', 'Why are some routes faster?']
};

export const CITY_ALIASES: Record<string, string> = {
  japan: 'tok',
  japanese: 'tok',
  tokyo: 'tok',
  america: 'lax',
  usa: 'nyc',
  us: 'nyc',
  'united states': 'nyc',
  uk: 'lon',
  britain: 'lon',
  england: 'lon',
  london: 'lon',
  sg: 'sgp',
  singapore: 'sgp',
  india: 'mum',
  mumbai: 'mum',
  uae: 'dxb',
  dubai: 'dxb',
  germany: 'fra',
  frankfurt: 'fra',
  australia: 'syd',
  sydney: 'syd',
  brazil: 'sao',
  'sao paulo': 'sao',
  'south america': 'sao',
  'new york': 'nyc',
  nyc: 'nyc',
  'los angeles': 'lax',
  la: 'lax',
};

function normalizeCityKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function resolveCityId(input: string): string | null {
  const normalizedInput = normalizeCityKey(input);
  if (!normalizedInput) return null;

  const directId = CITIES.find(
    city =>
      normalizeCityKey(city.id) === normalizedInput ||
      normalizeCityKey(city.name) === normalizedInput,
  );
  if (directId) return directId.id;

  const aliasId = CITY_ALIASES[normalizedInput];
  if (aliasId) return aliasId;

  const containsCity = CITIES.find(city =>
    normalizedInput.includes(normalizeCityKey(city.name)),
  );
  if (containsCity) return containsCity.id;

  for (const [alias, cityId] of Object.entries(CITY_ALIASES)) {
    if (normalizedInput.includes(alias)) {
      return cityId;
    }
  }

  return null;
}

export function resolveCityIndex(input: string): number {
  const resolvedCityId = resolveCityId(input);
  if (!resolvedCityId) return -1;
  return CITIES.findIndex(city => city.id === resolvedCityId);
}

// ═══════════════════════════════════════════════════════════
// DERIVED DATA — For backward compatibility with globe code
// ═══════════════════════════════════════════════════════════

// Map city IDs to array indices
const cityIdToIndex = new Map(CITIES.map((city, i) => [city.id, i]));

// Convert CONNECTIONS to index-based format for globe.gl
export const CONNS = CONNECTIONS.map(conn => {
  const fromIdx = cityIdToIndex.get(conn.from);
  const toIdx = cityIdToIndex.get(conn.to);
  if (fromIdx === undefined || toIdx === undefined) {
    console.error(`Invalid connection: ${conn.from} → ${conn.to}`);
    return [0, 0, 'amber'] as const;
  }

  // Assign colors based on connection type
  let color: 'amber' | 'teal' | 'steel';
  if (conn.type === 'Subsea cable') {
    // Transpacific/Transatlantic: amber, Asia-Europe: teal, Americas/Oceania: steel
    if (conn.cable.includes('FASTER') || conn.cable.includes('SEA-US') || conn.cable.includes('AEC-1') || conn.cable.includes('TAT-14')) {
      color = 'amber';
    } else if (conn.cable.includes('SEA-ME-WE') || conn.cable.includes('FLAG')) {
      color = 'teal';
    } else {
      color = 'steel';
    }
  } else {
    color = 'amber'; // Land cables
  }

  return [fromIdx, toIdx, color] as const;
});

export const ARC_COLORS: Record<string, string> = {
  amber: '#e8a020',
  teal: '#0cb8a2',
  steel: '#5b8fd4',
};

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS — Fase 1 data utility exports
// ═══════════════════════════════════════════════════════════

/**
 * Find connection by ID (string identifier)
 */
export function getConnectionById(connId: string): Connection | null {
  return CONNECTIONS.find(conn => conn.id === connId) ?? null;
}

/**
 * Find connection by from/to city IDs
 */
export function getConnectionByRoute(
  fromId: string,
  toId: string,
): Connection | null {
  return CONNECTIONS.find(conn => conn.from === fromId && conn.to === toId) ?? null;
}

/**
 * Get all backup routes for a connection
 */
export function getBackupRoutes(connId: string): Connection[] {
  const conn = getConnectionById(connId);
  if (!conn) return [];
  return conn.backupRouteIds
    .map(id => getConnectionById(id))
    .filter((c): c is Connection => c !== null);
}

/**
 * Get connections that share risk types (for pattern analysis)
 */
export function getConnectionsByRiskType(riskType: string): Connection[] {
  return CONNECTIONS.filter(conn => conn.riskType === riskType);
}

/**
 * Calculate average congestion in a region (by city)
 */
export function getRegionCongestion(cityId: string): number {
  const conns = CONNECTIONS.filter(
    conn => conn.from === cityId || conn.to === cityId,
  );
  if (conns.length === 0) return 0;
  return Math.round(conns.reduce((sum, c) => sum + c.congestionScore, 0) / conns.length);
}

