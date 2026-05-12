import fs from 'fs';

const HUBS = [
  { id: 'cloudflare', name: 'Cloudflare', query: 'Cloudflare San Jose' },
  { id: 'google-cloud', name: 'Google Cloud', query: 'Google Data Center Jurong West Singapore' },
  { id: 'microsoft-azure', name: 'Microsoft Azure', query: 'Microsoft Data Center Dublin' },
  { id: 'aws', name: 'AWS', query: 'Amazon Web Services Data Center Ashburn' },
  { id: 'meta', name: 'Meta', query: 'Meta Data Center DeKalb Chicago' },
  { id: 'akamai', name: 'Akamai', query: 'Akamai Technologies Cambridge Boston' },
  { id: 'fastly', name: 'Fastly', query: 'Fastly San Francisco' },
  { id: 'oracle-cloud', name: 'Oracle Cloud', query: 'Oracle Data Center Phoenix' },
  { id: 'alibaba-cloud', name: 'Alibaba Cloud', query: 'Alibaba Cloud Shanghai' },
  { id: 'tencent-cloud', name: 'Tencent Cloud', query: 'Tencent Cloud Hong Kong' },
  { id: 'equinix', name: 'Equinix', query: 'Equinix AM3 Amsterdam' },
  { id: 'digital-realty', name: 'Digital Realty', query: 'Digital Realty Richardson Dallas' },
  { id: 'ntt-communications', name: 'NTT Communications', query: 'NTT Data Center Tokyo' },
  { id: 'lumen', name: 'Lumen', query: 'Lumen Technologies Denver' },
  { id: 'deutsche-telekom', name: 'Deutsche Telekom', query: 'Deutsche Telekom Frankfurt' },
  { id: 'arelion', name: 'Arelion', query: 'Arelion Stockholm' },
  { id: 'zayo', name: 'Zayo', query: 'Zayo Group Chicago' },
  { id: 'starlink', name: 'Starlink', query: 'SpaceX Hawthorne Los Angeles' }
];

async function geocode() {
  console.log('Starting Geocoding Script for Exact Hub Locations...\n');
  const results = [];

  for (const hub of HUBS) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(hub.query)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'NetworkRookieScraper/1.0' } });
      const data = await res.json();

      if (data && data.length > 0) {
        console.log(`✅ Found: ${hub.name} -> Lat: ${data[0].lat}, Lng: ${data[0].lon}`);
        results.push({ ...hub, exactLat: parseFloat(data[0].lat), exactLng: parseFloat(data[0].lon) });
      } else {
        console.log(`❌ Not Found: ${hub.name} (Query: ${hub.query})`);
        results.push({ ...hub, exactLat: null, exactLng: null });
      }
    } catch (e) {
      console.log(`⚠️ Error for ${hub.name}: ${e.message}`);
    }
    // Respect rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  fs.writeFileSync('exact_hubs.json', JSON.stringify(results, null, 2));
  console.log('\nDone! Results saved to exact_hubs.json');
}

geocode();
