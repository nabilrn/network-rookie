The file exists with some data. Extend it to match this exact shape — everything the panel drawer, globe, and AI tutor will need:
ts// src/data/network.ts

export const CITIES = [
  { id: 'sgp', name: 'Singapore',   lat: 1.35,   lng: 103.82,
    region: 'Southeast Asia', hubTier: 1,
    fact: 'Home to Equinix SG — one of Asia\'s most important internet exchange points.' },

  { id: 'tok', name: 'Tokyo',       lat: 35.68,  lng: 139.69,
    region: 'East Asia',      hubTier: 1,
    fact: 'Connected to the US via the FASTER and JUPITER transpacific cable systems.' },

  { id: 'lon', name: 'London',      lat: 51.51,  lng: -0.13,
    region: 'Europe',         hubTier: 1,
    fact: 'LINX in London is one of the largest internet exchanges in the world.' },

  { id: 'nyc', name: 'New York',    lat: 40.71,  lng: -74.01,
    region: 'North America',  hubTier: 1,
    fact: 'Landing point for major transatlantic cables including AEC-1 and TAT-14.' },

  { id: 'lax', name: 'Los Angeles', lat: 34.05,  lng: -118.24,
    region: 'North America',  hubTier: 1,
    fact: 'Primary US landing point for transpacific cables connecting Asia to the Americas.' },

  { id: 'syd', name: 'Sydney',      lat: -33.87, lng: 151.21,
    region: 'Oceania',        hubTier: 2,
    fact: 'Australia\'s primary internet gateway, connected via the Southern Cross cable.' },

  { id: 'mum', name: 'Mumbai',      lat: 19.08,  lng: 72.88,
    region: 'South Asia',     hubTier: 2,
    fact: 'Key landing point for SEA-ME-WE cables linking Europe to Asia.' },

  { id: 'dxb', name: 'Dubai',       lat: 25.20,  lng: 55.27,
    region: 'Middle East',    hubTier: 2,
    fact: 'Critical transit hub connecting African, Asian, and European networks.' },

  { id: 'fra', name: 'Frankfurt',   lat: 50.11,  lng: 8.68,
    region: 'Europe',         hubTier: 1,
    fact: 'DE-CIX Frankfurt is the world\'s largest internet exchange by peak traffic.' },

  { id: 'sao', name: 'São Paulo',   lat: -23.55, lng: -46.63,
    region: 'South America',  hubTier: 2,
    fact: 'Latin America\'s largest internet hub, home to IX.br exchange point.' },
]

export const CONNECTIONS = [
  // Transpacific
  { from: 'lax', to: 'tok', latency: 108, cable: 'FASTER',         type: 'Subsea cable', bandwidth: '60 Tbps' },
  { from: 'lax', to: 'sgp', latency: 170, cable: 'SEA-US',         type: 'Subsea cable', bandwidth: '24 Tbps' },
  { from: 'syd', to: 'lax', latency: 152, cable: 'Southern Cross', type: 'Subsea cable', bandwidth: '20 Tbps' },
  { from: 'tok', to: 'sgp', latency: 71,  cable: 'JUPITER',        type: 'Subsea cable', bandwidth: '60 Tbps' },

  // Transatlantic
  { from: 'nyc', to: 'lon', latency: 75,  cable: 'AEC-1',          type: 'Subsea cable', bandwidth: '8.8 Tbps' },
  { from: 'nyc', to: 'fra', latency: 89,  cable: 'TAT-14',         type: 'Subsea cable', bandwidth: '3.2 Tbps' },
  { from: 'lon', to: 'fra', latency: 12,  cable: 'Terrestrial',    type: 'Land cable',   bandwidth: '100+ Tbps' },

  // Asia–Europe
  { from: 'sgp', to: 'mum', latency: 50,  cable: 'SEA-ME-WE 4',   type: 'Subsea cable', bandwidth: '1.28 Tbps' },
  { from: 'mum', to: 'dxb', latency: 18,  cable: 'SEA-ME-WE 5',   type: 'Subsea cable', bandwidth: '24 Tbps' },
  { from: 'dxb', to: 'lon', latency: 96,  cable: 'FLAG',           type: 'Subsea cable', bandwidth: '10 Tbps' },
  { from: 'lon', to: 'sgp', latency: 170, cable: 'SEA-ME-WE 3',   type: 'Subsea cable', bandwidth: '960 Gbps' },

  // Americas
  { from: 'nyc', to: 'sao', latency: 120, cable: 'SEABRAS-1',     type: 'Subsea cable', bandwidth: '72 Tbps' },
  { from: 'lax', to: 'sao', latency: 180, cable: 'Pan-Am',        type: 'Subsea cable', bandwidth: '24 Tbps' },

  // Oceania
  { from: 'syd', to: 'sgp', latency: 98,  cable: 'Indigo-West',   type: 'Subsea cable', bandwidth: '36 Tbps' },
  { from: 'syd', to: 'tok', latency: 108, cable: 'BASS',          type: 'Subsea cable', bandwidth: '40 Tbps' },

  // Middle East–Europe
  { from: 'dxb', to: 'fra', latency: 55,  cable: 'SMW-5',         type: 'Subsea cable', bandwidth: '24 Tbps' },
]

export const CHIP_QUESTIONS: Record<string, string[]> = {
  sgp: ['Why is Singapore an internet hub?', 'What is the SEA-ME-WE cable?', 'How fast is data from here to London?'],
  tok: ['Why does Tokyo have such high load?', 'What is the FASTER cable?', 'How does Japan route its internet traffic?'],
  lon: ['What is an internet exchange point?', 'Why is London a major hub?', 'How does data cross the Atlantic?'],
  nyc: ['What is the TAT-14 cable?', 'How does transatlantic data travel?', 'Why is New York important for the internet?'],
  lax: ['Why does LA connect to Asia?', 'What is the transpacific cable?', 'How long does data take to reach Tokyo?'],
  syd: ['How is Australia connected to the world?', 'What is the Southern Cross cable?', 'Why is Australian internet sometimes slow?'],
  mum: ['Why is Mumbai a cable landing point?', 'What is SEA-ME-WE?', 'How does India connect to Europe?'],
  dxb: ['Why is Dubai a transit hub?', 'How does the Middle East connect to Europe?', 'What cables land in Dubai?'],
  fra: ['What is DE-CIX?', 'Why is Frankfurt the largest internet exchange?', 'How does Europe route its traffic?'],
  sao: ['How is South America connected?', 'What is IX.br?', 'Why is São Paulo Latin America\'s internet hub?'],
  default: ['How does data travel between cities?', 'What is a submarine cable?', 'Why do some routes take longer?']
}