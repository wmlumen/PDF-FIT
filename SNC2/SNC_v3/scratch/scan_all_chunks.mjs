const allScripts = [
  '/_next/static/chunks/0fy4h0ngk1igg.js',
  '/_next/static/chunks/30kexb5xptfhr.js',
  '/_next/static/chunks/3rn5xu1nx1tsv.js',
  '/_next/static/chunks/11jq0c2_zavac.js',
  '/_next/static/chunks/34wvn5zw0a69w.js',
  '/_next/static/chunks/turbopack-44k8j6xv3c-qk.js',
  '/_next/static/chunks/3fntmmi971322.js',
  '/_next/static/chunks/06t5diz-aov6y.js',
  '/_next/static/chunks/203glc4wy59vn.js',
  '/_next/static/chunks/3xnme4yzuqpzi.js',
  '/_next/static/chunks/0kqwpdcvjg70h.js',
  '/_next/static/chunks/1xxpw9x27cjc0.js',
  '/_next/static/chunks/1vdcgc7951qwb.js',
  '/_next/static/chunks/2j8lrk__upz0w.js',
  '/_next/static/chunks/2vjh0nwt7qme6.js',
  '/_next/static/chunks/0rqj89kb3n8q8.js',
  '/_next/static/chunks/0cz1d0mv5g_q7.js',
  '/_next/static/chunks/3ivcc6t1s04dh.js'
];

for (const s of allScripts) {
  try {
    const res = await fetch('https://hub.structec.com.py' + s);
    const text = await res.text();
    const hits = ['maplibre', 'mapbox', 'leaflet', 'openlayers', 'cesium', 'deck.gl', 'protomaps', 'pmtiles', 'cog', 'geotiff', 'turf', 'tile', 'layer', 'geojson']
      .filter(k => text.toLowerCase().includes(k));
    if (hits.length > 0) {
      console.log(`${s} (${text.length}b): ${hits.join(', ')}`);
    }
  } catch (e) {
    console.error(s, e);
  }
}
