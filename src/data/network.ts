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

const CORE_CITIES: City[] = [
  { id: 'sgp', name: 'Singapore', lat: 1.35, lng: 103.82,
    region: 'Southeast Asia', hubTier: 1,
    fact: 'Home to Equinix SG — one of Asia\'s most important internet exchange points.',
    flag: '🇸🇬',
    countryCode: 'SG',
    friendlyFact: 'Singapore is a tiny island where many global internet routes meet before spreading across Asia.',
    heroStat: 'Connects major traffic between Asia, Europe, and North America' },

  { id: 'tok', name: 'Tokyo', lat: 35.68, lng: 139.69,
    region: 'East Asia', hubTier: 1,
    fact: 'Connected to the US via the FASTER and JUPITER transpacific cable systems.',
    flag: '🇯🇵',
    countryCode: 'JP',
    friendlyFact: 'Tokyo is one of the fastest digital crossroads in Asia for games, video, and everyday apps.',
    heroStat: 'Hosts one of the world\'s busiest metro fiber networks' },

  { id: 'lon', name: 'London', lat: 51.51, lng: -0.13,
    region: 'Europe', hubTier: 1,
    fact: 'LINX in London is one of the largest internet exchanges in the world.',
    flag: '🇬🇧',
    countryCode: 'GB',
    friendlyFact: 'London is a major meeting point where traffic from Europe and across the Atlantic swaps routes quickly.',
    heroStat: 'Links Europe with North America through multiple high-capacity routes' },

  { id: 'nyc', name: 'New York', lat: 40.71, lng: -74.01,
    region: 'North America', hubTier: 1,
    fact: 'Landing point for major transatlantic cables including AEC-1 and TAT-14.',
    flag: '🇺🇸',
    countryCode: 'US',
    friendlyFact: 'New York is a huge digital doorway where information enters and leaves the US east coast.',
    heroStat: 'Handles massive transatlantic traffic every second' },

  { id: 'lax', name: 'Los Angeles', lat: 34.05, lng: -118.24,
    region: 'North America', hubTier: 1,
    fact: 'Primary US landing point for transpacific cables connecting Asia to the Americas.',
    flag: '🇺🇸',
    countryCode: 'US',
    friendlyFact: 'Los Angeles is a key west-coast launch point for internet routes crossing the Pacific Ocean.',
    heroStat: 'Connects North America to Asia over multiple ocean cable systems' },

  { id: 'syd', name: 'Sydney', lat: -33.87, lng: 151.21,
    region: 'Oceania', hubTier: 2,
    fact: 'Australia\'s primary internet gateway, connected via the Southern Cross cable.',
    flag: '🇦🇺',
    countryCode: 'AU',
    friendlyFact: 'Sydney is Australia\'s main internet gateway to the rest of the world.',
    heroStat: 'Carries much of Australia\'s international internet traffic' },

  { id: 'mum', name: 'Mumbai', lat: 19.08, lng: 72.88,
    region: 'South Asia', hubTier: 2,
    fact: 'Key landing point for SEA-ME-WE cables linking Europe to Asia.',
    flag: '🇮🇳',
    countryCode: 'IN',
    friendlyFact: 'Mumbai helps connect India to Europe, the Middle East, and Southeast Asia through major cable landings.',
    heroStat: 'One of India\'s most important international cable gateways' },

  { id: 'dxb', name: 'Dubai', lat: 25.20, lng: 55.27,
    region: 'Middle East', hubTier: 2,
    fact: 'Critical transit hub connecting African, Asian, and European networks.',
    flag: '🇦🇪',
    countryCode: 'AE',
    friendlyFact: 'Dubai sits in a strategic location that helps internet routes pass between continents.',
    heroStat: 'Bridges traffic flows between Europe, Asia, and Africa' },

  { id: 'fra', name: 'Frankfurt', lat: 50.11, lng: 8.68,
    region: 'Europe', hubTier: 1,
    fact: 'DE-CIX Frankfurt is the world\'s largest internet exchange by peak traffic.',
    flag: '🇩🇪',
    countryCode: 'DE',
    friendlyFact: 'Frankfurt is a central handoff point that keeps Europe\'s internet routes short and fast.',
    heroStat: 'Home to DE-CIX, the world\'s largest internet exchange by peak traffic' },

  { id: 'sao', name: 'São Paulo', lat: -23.55, lng: -46.63,
    region: 'South America', hubTier: 2,
    fact: 'Latin America\'s largest internet hub, home to IX.br exchange point.',
    flag: '🇧🇷',
    countryCode: 'BR',
    friendlyFact: 'São Paulo is the biggest internet meeting point in South America for local and global routes.',
    heroStat: 'Anchors the largest internet hub in Latin America' },
];

type CitySeed = {
  id: string;
  name: string;
  countryCode: string;
  lat: number;
  lng: number;
  region: string;
  hubTier: 1 | 2;
};

type HubDriver = 'data-center' | 'population' | 'cable-landing' | 'enterprise';

const EXTRA_CITY_SEEDS: CitySeed[] = [
  // ── Europe ──
  { id: 'ams', name: 'Amsterdam', countryCode: 'NL', lat: 52.37, lng: 4.90, region: 'Europe', hubTier: 1 },    // Equinix
  { id: 'par', name: 'Paris', countryCode: 'FR', lat: 48.86, lng: 2.35, region: 'Europe', hubTier: 1 },
  { id: 'mad', name: 'Madrid', countryCode: 'ES', lat: 40.42, lng: -3.70, region: 'Europe', hubTier: 1 },
  { id: 'sto', name: 'Stockholm', countryCode: 'SE', lat: 59.33, lng: 18.07, region: 'Europe', hubTier: 2 },   // Arelion
  { id: 'dub', name: 'Dublin', countryCode: 'IE', lat: 53.35, lng: -6.26, region: 'Europe', hubTier: 2 },      // Azure
  { id: 'ber', name: 'Berlin', countryCode: 'DE', lat: 52.52, lng: 13.40, region: 'Europe', hubTier: 1 },
  { id: 'mil', name: 'Milan', countryCode: 'IT', lat: 45.46, lng: 9.19, region: 'Europe', hubTier: 2 },
  { id: 'lis', name: 'Lisbon', countryCode: 'PT', lat: 38.72, lng: -9.14, region: 'Europe', hubTier: 2 },

  // ── North America ──
  { id: 'chi', name: 'Chicago', countryCode: 'US', lat: 41.88, lng: -87.63, region: 'North America', hubTier: 1 },   // Meta, Zayo
  { id: 'sea', name: 'Seattle', countryCode: 'US', lat: 47.61, lng: -122.33, region: 'North America', hubTier: 1 },
  { id: 'sjc', name: 'San Jose', countryCode: 'US', lat: 37.34, lng: -121.89, region: 'North America', hubTier: 1 }, // Cloudflare
  { id: 'dal', name: 'Dallas', countryCode: 'US', lat: 32.78, lng: -96.80, region: 'North America', hubTier: 1 },    // Digital Realty
  { id: 'mia', name: 'Miami', countryCode: 'US', lat: 25.76, lng: -80.19, region: 'North America', hubTier: 1 },
  { id: 'atl', name: 'Atlanta', countryCode: 'US', lat: 33.75, lng: -84.39, region: 'North America', hubTier: 1 },
  { id: 'ash', name: 'Ashburn', countryCode: 'US', lat: 39.04, lng: -77.49, region: 'North America', hubTier: 1 },   // AWS
  { id: 'bos', name: 'Boston', countryCode: 'US', lat: 42.36, lng: -71.06, region: 'North America', hubTier: 1 },    // Akamai
  { id: 'den', name: 'Denver', countryCode: 'US', lat: 39.74, lng: -104.99, region: 'North America', hubTier: 2 },   // Lumen
  { id: 'phx', name: 'Phoenix', countryCode: 'US', lat: 33.45, lng: -112.07, region: 'North America', hubTier: 2 },  // Oracle Cloud
  { id: 'yyz', name: 'Toronto', countryCode: 'CA', lat: 43.65, lng: -79.38, region: 'North America', hubTier: 1 },
  { id: 'mex', name: 'Mexico City', countryCode: 'MX', lat: 19.43, lng: -99.13, region: 'North America', hubTier: 1 },

  // ── South America ──
  { id: 'bog', name: 'Bogota', countryCode: 'CO', lat: 4.71, lng: -74.07, region: 'South America', hubTier: 1 },
  { id: 'bue', name: 'Buenos Aires', countryCode: 'AR', lat: -34.60, lng: -58.38, region: 'South America', hubTier: 1 },

  // ── East Asia ──
  { id: 'hkg', name: 'Hong Kong', countryCode: 'HK', lat: 22.32, lng: 114.17, region: 'East Asia', hubTier: 1 },     // Tencent Cloud
  { id: 'tpe', name: 'Taipei', countryCode: 'TW', lat: 25.03, lng: 121.57, region: 'East Asia', hubTier: 1 },
  { id: 'icn', name: 'Seoul', countryCode: 'KR', lat: 37.57, lng: 126.98, region: 'East Asia', hubTier: 1 },
  { id: 'pvg', name: 'Shanghai', countryCode: 'CN', lat: 31.23, lng: 121.47, region: 'East Asia', hubTier: 1 },      // Alibaba Cloud
  { id: 'pek', name: 'Beijing', countryCode: 'CN', lat: 39.90, lng: 116.41, region: 'East Asia', hubTier: 1 },
  { id: 'szx', name: 'Shenzhen', countryCode: 'CN', lat: 22.55, lng: 114.06, region: 'East Asia', hubTier: 1 },
  { id: 'osa', name: 'Osaka', countryCode: 'JP', lat: 34.69, lng: 135.50, region: 'East Asia', hubTier: 1 },

  // ── Southeast Asia ──
  { id: 'bkk', name: 'Bangkok', countryCode: 'TH', lat: 13.76, lng: 100.50, region: 'Southeast Asia', hubTier: 1 },
  { id: 'kul', name: 'Kuala Lumpur', countryCode: 'MY', lat: 3.14, lng: 101.69, region: 'Southeast Asia', hubTier: 1 },
  { id: 'jkt', name: 'Jakarta', countryCode: 'ID', lat: -6.21, lng: 106.85, region: 'Southeast Asia', hubTier: 1 },
  { id: 'hcm', name: 'Ho Chi Minh City', countryCode: 'VN', lat: 10.82, lng: 106.63, region: 'Southeast Asia', hubTier: 2 },

  // ── South Asia ──
  { id: 'del', name: 'Delhi', countryCode: 'IN', lat: 28.61, lng: 77.21, region: 'South Asia', hubTier: 1 },
  { id: 'chn', name: 'Chennai', countryCode: 'IN', lat: 13.08, lng: 80.27, region: 'South Asia', hubTier: 1 },
  { id: 'blr', name: 'Bengaluru', countryCode: 'IN', lat: 12.97, lng: 77.59, region: 'South Asia', hubTier: 1 },
  { id: 'khi', name: 'Karachi', countryCode: 'PK', lat: 24.86, lng: 67.01, region: 'South Asia', hubTier: 2 },

  // ── Middle East ──
  { id: 'ist', name: 'Istanbul', countryCode: 'TR', lat: 41.01, lng: 28.98, region: 'Middle East', hubTier: 1 },
  { id: 'cai', name: 'Cairo', countryCode: 'EG', lat: 30.04, lng: 31.24, region: 'Middle East', hubTier: 1 },
  { id: 'tlv', name: 'Tel Aviv', countryCode: 'IL', lat: 32.09, lng: 34.78, region: 'Middle East', hubTier: 2 },

  // ── Africa ──
  { id: 'jnb', name: 'Johannesburg', countryCode: 'ZA', lat: -26.20, lng: 28.04, region: 'Africa', hubTier: 1 },
  { id: 'nbo', name: 'Nairobi', countryCode: 'KE', lat: -1.29, lng: 36.82, region: 'Africa', hubTier: 2 },
  { id: 'los', name: 'Lagos', countryCode: 'NG', lat: 6.52, lng: 3.38, region: 'Africa', hubTier: 1 },
];

const countryCodeToFlag = (countryCode: string): string =>
  countryCode
    .toUpperCase()
    .replace(/[A-Z]/g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));

const DATA_CENTER_HUB_IDS = new Set([
  'ams', 'par', 'dub', 'ber', 'chi', 'sea', 'sjc', 'dal', 'mia', 'atl', 'ash', 'bos', 'yyz', 'mex',
  'hkg', 'tpe', 'icn', 'bkk', 'kul', 'jkt', 'del', 'blr', 'pvg', 'pek', 'szx',
  'osa', 'ist', 'jnb', 'cai',
]);

const POPULATION_HUB_IDS = new Set([
  'mad', 'mil', 'bog', 'bue',
  'chn', 'hcm', 'khi', 'los',
]);

const CABLE_LANDING_HUB_IDS = new Set([
  'lis', 'sto',
]);

const hashKey = (value: string): number =>
  value.split('').reduce((acc, ch, index) => acc + ch.charCodeAt(0) * (index + 1), 0);

const getHubDriver = (seed: CitySeed): HubDriver => {
  if (DATA_CENTER_HUB_IDS.has(seed.id)) return 'data-center';
  if (POPULATION_HUB_IDS.has(seed.id)) return 'population';
  if (CABLE_LANDING_HUB_IDS.has(seed.id)) return 'cable-landing';
  return 'enterprise';
};

const getCityNarrative = (seed: CitySeed): Pick<City, 'fact' | 'friendlyFact' | 'heroStat'> => {
  const driver = getHubDriver(seed);
  const variant = hashKey(seed.id) % 3;

  if (driver === 'data-center') {
    return {
      fact: `${seed.name} is known for large data center campuses where many networks connect in one place.`,
      friendlyFact: variant === 0
        ? `${seed.name} is a hub because many digital infrastructure facilities are concentrated here.`
        : variant === 1
          ? `${seed.name} handles heavy traffic because many large server clusters are hosted in this area.`
          : `${seed.name} is chosen as a hub because many global cloud and computing platforms operate here.`,
      heroStat: seed.hubTier === 1
        ? 'Strong cloud and data center concentration for global traffic'
        : 'Regional data center cluster keeps nearby traffic fast',
    };
  }

  if (driver === 'population') {
    return {
      fact: `${seed.name} handles heavy internet demand from a very large urban population and app usage.`,
      friendlyFact: variant === 0
        ? `${seed.name} is a hub because daily internet demand from local users is very high.`
        : variant === 1
          ? `A large online population in ${seed.name} drives major internet routes to grow quickly.`
          : `${seed.name} has high traffic because digital activity is dense across the metro area.`,
      heroStat: seed.hubTier === 1
        ? 'Massive user demand drives high-throughput internet routes'
        : 'Large local demand makes this city an important relay',
    };
  }

  if (driver === 'cable-landing') {
    return {
      fact: `${seed.name} is important because major submarine or coastal cables land near this metro area.`,
      friendlyFact: variant === 0
        ? `${seed.name} is important because it serves as a landing gateway between submarine cables and land networks.`
        : variant === 1
          ? `Many international internet routes enter through infrastructure near ${seed.name}.`
          : `${seed.name} is a hub because it sits near major international cable landing points.`,
      heroStat: seed.hubTier === 1
        ? 'International cable landing routes connect through this metro'
        : 'Coastal cable access supports regional internet flow',
    };
  }

  return {
    fact: `${seed.name} acts as a strategic business and transit junction between regional network operators.`,
    friendlyFact: variant === 0
      ? `${seed.name} is a hub because its location is strategic for forwarding traffic across regions.`
      : variant === 1
        ? `${seed.name} matters for internet routing because many operators interconnect in this corridor.`
        : `${seed.name} helps connect traffic between nearby major cities and business zones.`,
    heroStat: seed.hubTier === 1
      ? 'Strategic enterprise transit point for cross-region traffic'
      : 'Regional backbone junction for surrounding cities',
  };
};

const buildAutoCity = (seed: CitySeed): City => ({
  ...getCityNarrative(seed),
  id: seed.id,
  name: seed.name,
  countryCode: seed.countryCode,
  flag: countryCodeToFlag(seed.countryCode),
  lat: seed.lat,
  lng: seed.lng,
  region: seed.region,
  hubTier: seed.hubTier,
});

export const CITIES: City[] = [
  ...CORE_CITIES,
  ...EXTRA_CITY_SEEDS.map(buildAutoCity),
];

export type CompanyHub = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  logoPath: string;
  markerColor: string;
  note: string;
  focus: string;
  visitorFact: string;
};

const assetPath = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export const COMPANY_HUBS: CompanyHub[] = [
  { id: 'cloudflare', name: 'Cloudflare', lat: 37.34, lng: -121.89, logoPath: assetPath('asset/cloudflare.svg'), markerColor: '#f38020', note: 'Edge network and CDN hub', focus: 'Edge and security network', visitorFact: 'Cloudflare helps websites stay fast and protected by serving content from many nearby edge locations.' },
  { id: 'google-cloud', name: 'Google Cloud', lat: 1.35, lng: 103.82, logoPath: assetPath('asset/google-cloud.svg'), markerColor: '#4285f4', note: 'Global cloud backbone hub', focus: 'Hyperscale cloud platform', visitorFact: 'Google Cloud runs a private global backbone that moves app and video data between regions.' },
  { id: 'microsoft-azure', name: 'Microsoft Azure', lat: 53.35, lng: -6.26, logoPath: assetPath('asset/azure.svg'), markerColor: '#0078d4', note: 'Global cloud region hub', focus: 'Enterprise cloud platform', visitorFact: 'Azure powers many business services and keeps traffic close to users with many global regions.' },
  { id: 'aws', name: 'AWS', lat: 39.04, lng: -77.49, logoPath: assetPath('asset/aws.svg'), markerColor: '#ff9900', note: 'Hyperscale cloud region hub', focus: 'Largest cloud infrastructure footprint', visitorFact: 'AWS runs one of the biggest cloud footprints, so many apps you use every day pass through AWS regions.' },
  { id: 'meta', name: 'Meta', lat: 41.88, lng: -87.63, logoPath: assetPath('asset/meta.svg'), markerColor: '#0668e1', note: 'Private backbone traffic hub', focus: 'Social platform private backbone', visitorFact: 'Meta builds private long-distance links so messages, photos, and videos travel quickly between continents.' },
  { id: 'akamai', name: 'Akamai', lat: 42.36, lng: -71.06, logoPath: assetPath('asset/akamai.svg'), markerColor: '#d71920', note: 'CDN edge delivery hub', focus: 'Global content delivery network', visitorFact: 'Akamai places copies of content closer to users, so pages and streams load faster.' },
  { id: 'fastly', name: 'Fastly', lat: 37.77, lng: -122.42, logoPath: assetPath('asset/fastly.svg'), markerColor: '#ff282d', note: 'Edge cloud and CDN hub', focus: 'Real-time edge delivery', visitorFact: 'Fastly routes traffic through edge locations to reduce waiting time for dynamic websites and APIs.' },
  { id: 'oracle-cloud', name: 'Oracle Cloud', lat: 33.45, lng: -112.07, logoPath: assetPath('asset/oracle-cloud.svg'), markerColor: '#f80000', note: 'Cloud infrastructure hub', focus: 'Cloud for data-heavy systems', visitorFact: 'Oracle Cloud supports many data-heavy business systems and keeps copies of services in multiple regions.' },
  { id: 'alibaba-cloud', name: 'Alibaba Cloud', lat: 31.23, lng: 121.47, logoPath: assetPath('asset/alibaba-cloud.svg'), markerColor: '#ff6a00', note: 'Cloud backbone hub in Asia', focus: 'Cloud platform with strong Asia reach', visitorFact: 'Alibaba Cloud carries large traffic across Asia and supports many online shopping and payment services.' },
  { id: 'tencent-cloud', name: 'Tencent Cloud', lat: 22.32, lng: 114.17, logoPath: assetPath('asset/tencent-cloud.svg'), markerColor: '#0052d9', note: 'Cloud and gaming traffic hub', focus: 'Cloud platform and media delivery', visitorFact: 'Tencent Cloud supports game, chat, and media platforms that need stable low-delay routing.' },
  { id: 'equinix', name: 'Equinix', lat: 52.37, lng: 4.90, logoPath: assetPath('asset/equinix.svg'), markerColor: '#ed174f', note: 'Data center and IX interconnect hub', focus: 'Carrier-neutral data center campuses', visitorFact: 'Equinix is a meeting place where many networks connect directly, which reduces travel distance for data.' },
  { id: 'digital-realty', name: 'Digital Realty', lat: 32.78, lng: -96.80, logoPath: assetPath('asset/digital-realty.svg'), markerColor: '#00843d', note: 'Carrier-neutral data center hub', focus: 'Large colocation platform', visitorFact: 'Digital Realty hosts many internet providers and cloud systems in shared facilities.' },
  { id: 'ntt-communications', name: 'NTT Communications', lat: 35.68, lng: 139.69, logoPath: assetPath('asset/ntt-communications.svg'), markerColor: '#0033a0', note: 'Tier-1 backbone and data center hub', focus: 'Global backbone and enterprise network', visitorFact: 'NTT links major regions with long-distance fiber and large exchange points.' },
  { id: 'lumen', name: 'Lumen', lat: 39.74, lng: -104.99, logoPath: assetPath('asset/lumen.svg'), markerColor: '#5f259f', note: 'Long-haul backbone hub', focus: 'High-capacity long-distance fiber', visitorFact: 'Lumen moves large traffic volumes across metro and cross-country fiber routes.' },
  { id: 'deutsche-telekom', name: 'Deutsche Telekom', lat: 50.11, lng: 8.68, logoPath: assetPath('asset/deutsche-telekom.svg'), markerColor: '#e20074', note: 'European backbone hub', focus: 'European telecom backbone', visitorFact: 'Deutsche Telekom helps route massive traffic within Europe through major interconnect cities.' },
  { id: 'arelion', name: 'Arelion', lat: 59.33, lng: 18.07, logoPath: assetPath('asset/arelion.svg'), markerColor: '#14a3ff', note: 'Global Tier-1 transit hub', focus: 'Internet transit backbone provider', visitorFact: 'Arelion connects networks that need direct global transit across continents.' },
  { id: 'zayo', name: 'Zayo', lat: 41.88, lng: -87.63, logoPath: assetPath('asset/zayo.svg'), markerColor: '#0077c8', note: 'Metro and long-haul fiber hub', focus: 'Dense metro and long-haul fiber', visitorFact: 'Zayo links data centers and mobile networks with high-capacity fiber corridors.' },
  { id: 'starlink', name: 'Starlink', lat: 34.05, lng: -118.24, logoPath: assetPath('asset/starlink.svg'), markerColor: '#94a3b8', note: 'Satellite gateway network hub', focus: 'Low-orbit satellite internet gateway', visitorFact: 'Starlink connects satellites to ground gateways so internet can reach remote places.' },
];

const CORE_CONNECTIONS: Connection[] = [
  // Transpacific
  { id: 'lax-tok-faster', from: 'lax', to: 'tok', latency: 108, cable: 'FASTER',         type: 'Subsea cable', bandwidth: '60 Tbps', distanceKm: 9000,  depthM: 4500, blinkComparison: 'about as fast as a camera click',              funFact: 'FASTER was built by a consortium including Google and links Japan directly to the US west coast.', riskType: 'earthquake', backupRouteIds: ['tok-sgp-jupiter', 'lax-sgp-sea-us'], congestionScore: 35, recoveryHint: 'Major rupture requires new cable installation; traffic reroutes through Southeast Asia hub (3-5 hours typical).' },
  { id: 'lax-sgp-sea-us', from: 'lax', to: 'sgp', latency: 170, cable: 'SEA-US',         type: 'Subsea cable', bandwidth: '24 Tbps', distanceKm: 14800, depthM: 4700, blinkComparison: 'still faster than you can say hello',      funFact: 'SEA-US is part of a modern Pacific route designed to improve resilience for Southeast Asia traffic.', riskType: 'anchor', backupRouteIds: ['lax-tok-faster', 'syd-sgp-indigo'], congestionScore: 28, recoveryHint: 'Ship anchor damage typically fixed within hours; temporary reroute through nearby cables.' },
  { id: 'syd-lax-sc', from: 'syd', to: 'lax', latency: 152, cable: 'Southern Cross', type: 'Subsea cable', bandwidth: '20 Tbps', distanceKm: 12500, depthM: 4200, blinkComparison: 'still faster than you can say hello',      funFact: 'The Southern Cross network uses diverse paths so outages on one segment do not isolate Australia.', riskType: 'earthquake', backupRouteIds: ['syd-tok-bass', 'syd-sgp-indigo'], congestionScore: 22, recoveryHint: 'Pacific earthquake damage needs cable repair ship dispatch; may take 2-4 weeks for major break.' },
  { id: 'tok-sgp-jupiter', from: 'tok', to: 'sgp', latency: 71,  cable: 'JUPITER',        type: 'Subsea cable', bandwidth: '60 Tbps', distanceKm: 5300,  depthM: 3500, blinkComparison: 'about as fast as a camera click',              funFact: 'JUPITER-class systems use advanced optical upgrades to keep adding capacity without replacing the whole cable.', riskType: 'congestion', backupRouteIds: ['tok-mum-smew4', 'sgp-mum-smew4'], congestionScore: 78, recoveryHint: 'High traffic during peak hours (6-10pm JST); offload to regional hubs or request lower-priority traffic defer.' },

  // Transatlantic
  { id: 'nyc-lon-aec1', from: 'nyc', to: 'lon', latency: 75,  cable: 'AEC-1',          type: 'Subsea cable', bandwidth: '8.8 Tbps', distanceKm: 5600,  depthM: 3800, blinkComparison: 'about as fast as a camera click',              funFact: 'Modern Atlantic cables are laid with repeater stations that boost light signals roughly every 60–100 km.', riskType: 'anchor', backupRouteIds: ['nyc-fra-tat14', 'lon-fra-terrestrial'], congestionScore: 45, recoveryHint: 'Anchor damage typically repaired within 24 hours by local repair services; very common in shipping lanes.' },
  { id: 'nyc-fra-tat14', from: 'nyc', to: 'fra', latency: 89,  cable: 'TAT-14',         type: 'Subsea cable', bandwidth: '3.2 Tbps', distanceKm: 6500,  depthM: 3500, blinkComparison: 'about as fast as a camera click',              funFact: 'TAT-14 was one of the first big ring-style Atlantic systems, helping reroute traffic during maintenance.', riskType: 'maintenance', backupRouteIds: ['nyc-lon-aec1', 'lon-fra-terrestrial'], congestionScore: 15, recoveryHint: 'Planned maintenance windows scheduled quarterly; traffic preemptively shifted 48 hours before.' },
  { id: 'lon-fra-terrestrial', from: 'lon', to: 'fra', latency: 12,  cable: 'Terrestrial',    type: 'Land cable',   bandwidth: '100+ Tbps', distanceKm: 650,   depthM: 0,    blinkComparison: 'faster than a blink',                          funFact: 'This route combines dense terrestrial fiber corridors and is one of Europe\'s busiest data paths.', riskType: 'congestion', backupRouteIds: ['nyc-lon-aec1', 'dxb-fra-smw5'], congestionScore: 88, recoveryHint: 'Peak congestion 8am-6pm CET from local trading floors; capacity upgrades ongoing.' },

  // Asia–Europe
  { id: 'sgp-mum-smew4', from: 'sgp', to: 'mum', latency: 50,  cable: 'SEA-ME-WE 4',   type: 'Subsea cable', bandwidth: '1.28 Tbps', distanceKm: 5000,  depthM: 3200, blinkComparison: 'about as fast as a camera click',              funFact: 'SEA-ME-WE 4 spans from Southeast Asia to Europe and has long served as a backbone route.', riskType: 'wireless', backupRouteIds: ['sgp-dxb-flag', 'tok-sgp-jupiter'], congestionScore: 32, recoveryHint: 'Tropical storms in Indian Ocean cause signal degradation (monsoon season Jun-Oct); reroute advised.' },
  { id: 'mum-dxb-smew5', from: 'mum', to: 'dxb', latency: 18,  cable: 'SEA-ME-WE 5',   type: 'Subsea cable', bandwidth: '24 Tbps',  distanceKm: 2200,  depthM: 2600, blinkComparison: 'faster than a blink',                          funFact: 'SEA-ME-WE 5 added newer design capacity to handle rapid growth between South Asia and the Gulf.', riskType: 'anchor', backupRouteIds: ['sgp-mum-smew4', 'dxb-lon-flag'], congestionScore: 38, recoveryHint: 'Common anchorage point for merchant ships; damage repair within 12-48 hours typical.' },
  { id: 'dxb-lon-flag', from: 'dxb', to: 'lon', latency: 96,  cable: 'FLAG',           type: 'Subsea cable', bandwidth: '10 Tbps',  distanceKm: 7000,  depthM: 3000, blinkComparison: 'about as fast as a camera click',              funFact: 'FLAG was one of the earliest very-long global fiber systems linking Europe and Asia at scale.', riskType: 'earthquake', backupRouteIds: ['sgp-mum-smew4', 'dxb-fra-smw5'], congestionScore: 29, recoveryHint: 'Red Sea tectonic zone; earthquakes can disrupt; reroute available via Middle East terrestrial.' },
  { id: 'lon-sgp-smew3', from: 'lon', to: 'sgp', latency: 170, cable: 'SEA-ME-WE 3',   type: 'Subsea cable', bandwidth: '960 Gbps', distanceKm: 10800, depthM: 3400, blinkComparison: 'still faster than you can say hello',      funFact: 'SEA-ME-WE 3 stretches roughly 39,000 km end-to-end, making it one of the longest submarine cable systems built.', riskType: 'maintenance', backupRouteIds: ['lon-fra-terrestrial', 'sgp-mum-smew4'], congestionScore: 18, recoveryHint: 'Older system; periodic maintenance windows; traffic shifted proactively to newer cables.' },

  // Americas
  { id: 'nyc-sao-seabras1', from: 'nyc', to: 'sao', latency: 120, cable: 'SEABRAS-1',     type: 'Subsea cable', bandwidth: '72 Tbps',  distanceKm: 7600,  depthM: 4200, blinkComparison: 'about as fast as a camera click',              funFact: 'Seabras-1 is one of the first direct modern links between the New York area and São Paulo area.', riskType: 'anchor', backupRouteIds: ['lax-sao-pan-am', 'nyc-lon-aec1'], congestionScore: 41, recoveryHint: 'South Atlantic shipping lanes; anchor damage requires specialized repair vessel; 24-48 hour fix.' },
  { id: 'lax-sao-pan-am', from: 'lax', to: 'sao', latency: 180, cable: 'Pan-Am',        type: 'Subsea cable', bandwidth: '24 Tbps',  distanceKm: 10200, depthM: 4000, blinkComparison: 'still faster than you can say hello',      funFact: 'Pan-American cable corridors connect west coast and Latin American landing points for route diversity.', riskType: 'earthquake', backupRouteIds: ['nyc-sao-seabras1', 'syd-lax-sc'], congestionScore: 26, recoveryHint: 'Pacific/Pacific-Atlantic juncture; seismic activity; earthquake ruptures rare but catastrophic.' },

  // Oceania
  { id: 'syd-sgp-indigo', from: 'syd', to: 'sgp', latency: 98,  cable: 'Indigo-West',   type: 'Subsea cable', bandwidth: '36 Tbps',  distanceKm: 6300,  depthM: 3800, blinkComparison: 'about as fast as a camera click',              funFact: 'Indigo systems were designed with open-cable technology so operators can upgrade equipment over time.', riskType: 'wireless', backupRouteIds: ['syd-tok-bass', 'syd-lax-sc'], congestionScore: 30, recoveryHint: 'Tropical cyclone season (Dec-Mar) causes intermittent signal loss; automatic failover triggered.' },
  { id: 'syd-tok-bass', from: 'syd', to: 'tok', latency: 108, cable: 'BASS',          type: 'Subsea cable', bandwidth: '40 Tbps',  distanceKm: 7800,  depthM: 4300, blinkComparison: 'about as fast as a camera click',              funFact: 'This Pacific corridor helps reduce dependency on a single northbound route out of Australia.', riskType: 'earthquake', backupRouteIds: ['syd-lax-sc', 'syd-sgp-indigo'], congestionScore: 24, recoveryHint: 'Trans-Tasman and Southwest Pacific seismic zones; rupture repair can take 3-6 weeks.' },

  // Middle East–Europe
  { id: 'dxb-fra-smw5', from: 'dxb', to: 'fra', latency: 55,  cable: 'SMW-5',         type: 'Subsea cable', bandwidth: '24 Tbps',  distanceKm: 4800,  depthM: 2500, blinkComparison: 'about as fast as a camera click',              funFact: 'SMW-5 includes multiple landing branches so traffic can be redistributed if one segment has issues.', riskType: 'anchor', backupRouteIds: ['dxb-lon-flag', 'lon-fra-terrestrial'], congestionScore: 36, recoveryHint: 'Red Sea and Mediterranean shipping corridors; anchor damage common; 12-24 hour typical repair.' },
];

const coreCityIds = new Set(CORE_CITIES.map((city) => city.id));
const cityById = new Map(CITIES.map((city) => [city.id, city]));

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const distanceKmBetween = (fromId: string, toId: string): number => {
  const from = cityById.get(fromId);
  const to = cityById.get(toId);
  if (!from || !to) return 0;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const getPairKey = (fromId: string, toId: string): string =>
  [fromId, toId].sort().join('-');

const regionalAnchorIds: Record<string, string[]> = {
  Europe: ['lon', 'fra', 'ams'],
  'North America': ['nyc', 'lax', 'ash'],
  'South America': ['sao', 'nyc', 'bog'],
  'East Asia': ['tok', 'sgp', 'hkg'],
  'Southeast Asia': ['sgp', 'tok', 'jkt'],
  'South Asia': ['mum', 'sgp', 'del'],
  'Middle East': ['dxb', 'fra', 'cai'],
  Oceania: ['syd', 'sgp', 'lax'],
  Africa: ['cai', 'dxb', 'jnb'],
  'Central Asia': ['dxb', 'fra', 'tok'],
};

const blinkByLatency = (latency: number): string => {
  if (latency <= 20) return 'faster than a blink';
  if (latency <= 90) return 'about as fast as a camera click';
  return 'still faster than you can say hello';
};

const pickRiskType = (routeId: string, type: Connection['type'], distanceKm: number): Connection['riskType'] => {
  if (type === 'Land cable') return distanceKm > 2000 ? 'maintenance' : 'congestion';
  const riskCycle: Connection['riskType'][] = ['anchor', 'earthquake', 'wireless', 'maintenance'];
  return riskCycle[hashKey(routeId) % riskCycle.length];
};

const recoveryHintByRisk: Record<Connection['riskType'], string> = {
  anchor: 'Ship activity can affect cables; traffic is moved to alternate paths while repairs are done.',
  earthquake: 'Seismic risk can damage long links; reroute plans are used to keep major services online.',
  congestion: 'When routes are busy, load balancing spreads traffic to neighboring links.',
  wireless: 'Weather and signal conditions can affect throughput; systems retry and re-route automatically.',
  maintenance: 'Planned maintenance windows move traffic to backup paths to avoid major interruptions.',
};

const bandwidthByTier = (fromId: string, toId: string, type: Connection['type']): string => {
  const fromTier = cityById.get(fromId)?.hubTier ?? 2;
  const toTier = cityById.get(toId)?.hubTier ?? 2;
  const score = fromTier + toTier;
  if (type === 'Land cable') return score >= 3 ? '40 Tbps' : '20 Tbps';
  return score >= 3 ? '24 Tbps' : '10 Tbps';
};

const buildAutoConnection = (fromId: string, toId: string): Connection | null => {
  if (fromId === toId) return null;
  const fromCity = cityById.get(fromId);
  const toCity = cityById.get(toId);
  if (!fromCity || !toCity) return null;

  const distanceKm = Math.max(120, distanceKmBetween(fromId, toId));
  const type: Connection['type'] = distanceKm > 1400 ? 'Subsea cable' : 'Land cable';
  const latency = Math.max(9, Math.round(distanceKm * 0.014 + (type === 'Subsea cable' ? 18 : 8)));
  const routeId = `auto-${getPairKey(fromId, toId)}`;
  const riskType = pickRiskType(routeId, type, distanceKm);

  return {
    id: routeId,
    from: fromId,
    to: toId,
    latency,
    cable: type === 'Subsea cable' ? `AutoLink Ocean ${fromCity.countryCode}-${toCity.countryCode}` : `AutoLink Metro ${fromCity.countryCode}-${toCity.countryCode}`,
    type,
    bandwidth: bandwidthByTier(fromId, toId, type),
    distanceKm,
    depthM: type === 'Subsea cable' ? 3200 : 0,
    blinkComparison: blinkByLatency(latency),
    funFact: `${fromCity.name} and ${toCity.name} exchange large traffic volumes to keep regional services responsive.`,
    riskType,
    backupRouteIds: [],
    congestionScore: Math.min(92, 28 + (hashKey(routeId) % 56)),
    recoveryHint: recoveryHintByRisk[riskType],
  };
};

const buildAutoConnections = (): Connection[] => {
  const MAX_AUTO_CONNECTIONS = 45;
  const generated: Connection[] = [];
  const pairKeys = new Set(CORE_CONNECTIONS.map((conn) => getPairKey(conn.from, conn.to)));

  const addConnection = (fromId: string, toId: string) => {
    if (generated.length >= MAX_AUTO_CONNECTIONS) return;
    const key = getPairKey(fromId, toId);
    if (pairKeys.has(key)) return;
    const conn = buildAutoConnection(fromId, toId);
    if (!conn) return;
    pairKeys.add(key);
    generated.push(conn);
  };

  CITIES.forEach((city) => {
    if (coreCityIds.has(city.id)) return;
    const anchors = regionalAnchorIds[city.region] ?? ['sgp', 'lon', 'fra'];
    const primaryAnchor = anchors.find((anchorId) => anchorId !== city.id);
    if (primaryAnchor) addConnection(city.id, primaryAnchor);
  });

  const citiesByRegion = new Map<string, typeof CITIES>();
  CITIES.forEach((city) => {
    const list = citiesByRegion.get(city.region) ?? [];
    list.push(city);
    citiesByRegion.set(city.region, list);
  });

  Array.from(citiesByRegion.values()).forEach((regionCities) => {
    if (generated.length >= MAX_AUTO_CONNECTIONS) return;
    const ordered = [...regionCities].sort((a, b) => a.lng - b.lng);
    for (let i = 0; i < ordered.length - 1; i += 1) {
      if (generated.length >= MAX_AUTO_CONNECTIONS) break;
      // Only connect stronger hubs in regional chain to keep globe responsive
      if (ordered[i].hubTier !== 1 && ordered[i + 1].hubTier !== 1) continue;
      addConnection(ordered[i].id, ordered[i + 1].id);
    }
  });

  return generated;
};

const AUTO_CONNECTIONS = buildAutoConnections();

export const CONNECTIONS: Connection[] = [
  ...CORE_CONNECTIONS,
  ...AUTO_CONNECTIONS,
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
  default: ['Tell me history about internet', 'How internet works', 'What are the important components of internet?']
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
  newyork: 'nyc',
  'new-york': 'nyc',
  'new york city': 'nyc',
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

export function resolveCityIdStrict(input: string): string | null {
  const normalizedInput = normalizeCityKey(input);
  if (!normalizedInput) return null;

  const directId = CITIES.find(
    city =>
      normalizeCityKey(city.id) === normalizedInput ||
      normalizeCityKey(city.name) === normalizedInput,
  );
  if (directId) return directId.id;

  const containsCity = CITIES.find(city =>
    normalizedInput.includes(normalizeCityKey(city.name)),
  );
  if (containsCity) return containsCity.id;

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

type ArcColorKey = 'amber' | 'teal' | 'steel';

const resolveArcColorKey = (conn: Connection): ArcColorKey => {
  if (conn.type !== 'Subsea cable') return 'amber';

  if (
    conn.cable.includes('FASTER') ||
    conn.cable.includes('SEA-US') ||
    conn.cable.includes('AEC-1') ||
    conn.cable.includes('TAT-14')
  ) {
    return 'amber';
  }

  if (conn.cable.includes('SEA-ME-WE') || conn.cable.includes('FLAG')) {
    return 'teal';
  }

  return 'steel';
};

const toConnTuple = (conn: Connection): readonly [number, number, ArcColorKey] => {
  const fromIdx = cityIdToIndex.get(conn.from);
  const toIdx = cityIdToIndex.get(conn.to);
  if (fromIdx === undefined || toIdx === undefined) {
    console.error(`Invalid connection: ${conn.from} → ${conn.to}`);
    return [0, 0, 'amber'] as const;
  }

  return [fromIdx, toIdx, resolveArcColorKey(conn)] as const;
};

// Convert CONNECTIONS to index-based format for globe.gl
export const CONNS = CONNECTIONS.map(conn => toConnTuple(conn));

export const ARC_COLORS: Record<string, string> = {
  amber: '#fcd34d', // Bright glowing yellow-amber
  teal: '#2dd4bf',  // Bright glowing teal
  steel: '#38bdf8', // Bright glowing sky blue
};

/**
 * Ensure a direct route exists between two cities.
 * If absent, creates an auto connection so simulation always has a visible path.
 */
export function ensureDirectConnection(fromInput: string, toInput: string): number | null {
  const fromId = resolveCityId(fromInput) ?? fromInput;
  const toId = resolveCityId(toInput) ?? toInput;
  if (!fromId || !toId || fromId === toId) return null;
  if (!cityIdToIndex.has(fromId) || !cityIdToIndex.has(toId)) return null;

  const existingIndex = CONNECTIONS.findIndex(
    (conn) =>
      (conn.from === fromId && conn.to === toId) ||
      (conn.from === toId && conn.to === fromId),
  );
  if (existingIndex >= 0) return existingIndex;

  const generated = buildAutoConnection(fromId, toId);
  if (!generated) return null;

  CONNECTIONS.push(generated);
  CONNS.push(toConnTuple(generated));
  return CONNECTIONS.length - 1;
}

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

