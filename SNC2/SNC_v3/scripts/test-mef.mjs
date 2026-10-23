import fs from 'fs';

async function checkSubpages() {
  const pages = [
    'https://ciudadessustentablesvep.mef.gov.py/mapas/',
    'https://ciudadessustentablesvep.mef.gov.py/datos/',
    'https://ciudadessustentablesvep.mef.gov.py/indicadores-ciudades/',
    'https://ciudadessustentablesvep.mef.gov.py/fichas-de-municipio/'
  ];
  for (const p of pages) {
    try {
      console.log('--- Checking:', p);
      const res = await fetch(p, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      console.log('Status:', res.status);
      const html = await res.text();
      console.log('Length:', html.length);
      // look for iframes or download links
      const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
      const iframes = [...html.matchAll(/src=["']([^"']+)["']/gi)].map(m => m[1]);
      const dataLinks = links.filter(l => /\.(geojson|shp|kml|zip|csv|xlsx|pdf)/i.test(l) || /geoserver|arcgis|qgis|api|map/i.test(l));
      console.log('Data/GIS links:');
      dataLinks.slice(0, 15).forEach(l => console.log('  ', l));
      const gisIframes = iframes.filter(i => /map|arcgis|geoserver|carto|viewer|dashboard/i.test(i));
      console.log('GIS Iframes:');
      gisIframes.forEach(i => console.log('  ', i));
    } catch (e) {
      console.error(e.message);
    }
  }
}
checkSubpages();
