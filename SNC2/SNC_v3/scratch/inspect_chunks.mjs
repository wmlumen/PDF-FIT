const scripts = [
  '/_next/static/chunks/30kexb5xptfhr.js',
  '/_next/static/chunks/11jq0c2_zavac.js',
  '/_next/static/chunks/34wvn5zw0a69w.js',
  '/_next/static/chunks/3fntmmi971322.js',
  '/_next/static/chunks/203glc4wy59vn.js',
  '/_next/static/chunks/3xnme4yzuqpzi.js',
  '/_next/static/chunks/1vdcgc7951qwb.js'
];

for (const s of scripts) {
  try {
    const res = await fetch('https://hub.structec.com.py' + s);
    const text = await res.text();
    console.log(`\nScript ${s} (${text.length} bytes):`);
    ['maplibre', 'mapbox', 'leaflet', 'openlayers', 'cesium', 'potree', 'three', 'protomaps', 'pmtiles', 'cog', 'geotiff', 'lucide', 'turf'].forEach(k => {
      if (text.includes(k)) console.log(`  found keyword: ${k}`);
    });
    // Check if there are layer actions or names
    if (text.includes('Encuadrar capa') || text.includes('Tabla de atributos') || text.includes('Ventana emergente')) {
      console.log('  *** FOUND Layer actions in ' + s + ' ***');
    }
  } catch (e) {
    console.error(s, e.message);
  }
}
