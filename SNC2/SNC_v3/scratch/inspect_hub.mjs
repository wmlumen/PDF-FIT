const url = 'https://hub.structec.com.py/shared/c4c831da-2ab8-4f86-98ca-b8fb7b38d67e';

try {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  console.log('Status:', res.status, res.statusText);
  const html = await res.text();
  console.log('HTML size:', html.length);
  
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] || '(no title)';
  console.log('Title:', title);
  
  const scripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]);
  console.log('\nScripts:', scripts);
  
  const stylesheets = [...html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].map(m => m[1]);
  console.log('\nStylesheets:', stylesheets);
  
  const meta = [...html.matchAll(/<meta[^>]+>/gi)].map(m => m[0]);
  console.log('\nMeta tags:', meta);
  
  // Look for keywords in the html: maplibre, mapbox, leaflet, openlayers, deck.gl, cesium, protomaps, geoserver, pmtiles, etc.
  const keywords = ['maplibre', 'mapbox', 'leaflet', 'openlayers', 'deck.gl', 'cesium', 'protomaps', 'geoserver', 'pmtiles', 'mvt', 'geopandas', 'turf', 'postgis', 'next', 'react', 'vue', 'svelte', 'tailwind'];
  console.log('\nKeyword matches:');
  for (const kw of keywords) {
    if (html.toLowerCase().includes(kw)) {
      console.log(` - ${kw}: MATCH`);
    }
  }
  
  // Dump first 2000 chars of body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    console.log('\nBody snippet (first 1000 chars):');
    console.log(bodyMatch[1].slice(0, 1000));
  }
} catch (e) {
  console.error('Fetch error:', e);
}
