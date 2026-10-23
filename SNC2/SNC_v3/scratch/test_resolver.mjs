import { URL } from 'url';

export async function parseCoordinateInput(input) {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();

  // 1. Google Maps URL (short or long)
  if (/^https?:\/\//i.test(str)) {
    let targetUrl = str;
    // If it's a shortlink (maps.app.goo.gl or goo.gl/maps), resolve redirect
    if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(str)) {
      try {
        const res = await fetch(str, { redirect: 'manual' });
        const loc = res.headers.get('location');
        if (loc) targetUrl = loc;
      } catch (e) {
        console.error('Error resolving short URL:', e);
      }
    }

    // Try extracting from targetUrl
    // Case A: !3d(-?[\d.]+)!4d(-?[\d.]+)
    const dLat = targetUrl.match(/!3d(-?\d+(?:\.\d+)?)/);
    const dLng = targetUrl.match(/!4d(-?\d+(?:\.\d+)?)/);
    // Case B: @(-?[\d.]+),(-?[\d.]+)
    const atMatch = targetUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    // Case C: q=(-?[\d.]+),(-?[\d.]+) or ll=... or query=...
    const qMatch = targetUrl.match(/[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?)[,+](-?\d+(?:\.\d+)?)/);
    // Place name
    const placeMatch = targetUrl.match(/\/place\/([^/@?]+)/);
    const label = placeMatch ? decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')) : 'Ubicación Google Maps';

    let lat = null, lng = null;
    if (dLat && dLng) {
      lat = parseFloat(dLat[1]);
      lng = parseFloat(dLng[1]);
    } else if (qMatch) {
      lat = parseFloat(qMatch[1]);
      lng = parseFloat(qMatch[2]);
    } else if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return { type: 'google_maps_url', lat, lng, label, original: str, resolvedUrl: targetUrl };
    }
  }

  // 2. Sexagesimal DMS: e.g. 25°18'10.2"S 57°30'48.1"W or 25°18'10.2"S, 57°30'48.1"W
  // Regex to match deg, min, sec, hemisphere
  const dmsRegex = /(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]?\s*([NSEOWnseow])/g;
  const dmsMatches = [...str.matchAll(dmsRegex)];
  if (dmsMatches.length === 2) {
    const parseDmsPart = (m) => {
      const deg = parseFloat(m[1]);
      const min = parseFloat(m[2]);
      const sec = parseFloat(m[3]);
      const hemi = m[4].toUpperCase();
      let val = deg + (min / 60) + (sec / 3600);
      if (hemi === 'S' || hemi === 'W' || hemi === 'O') val = -val;
      return { val, isLat: hemi === 'N' || hemi === 'S' };
    };
    const p1 = parseDmsPart(dmsMatches[0]);
    const p2 = parseDmsPart(dmsMatches[1]);
    const lat = p1.isLat ? p1.val : p2.val;
    const lng = !p1.isLat ? p1.val : p2.val;
    return { type: 'dms', lat, lng, label: `DMS: ${dmsMatches[0][0]}, ${dmsMatches[1][0]}`, original: str };
  }

  // 3. Decimal Degrees: e.g. -25.302609, -57.513558 or -25.302609 -57.513558
  const decRegex = /(-?\d{1,3}\.\d+)[,\s;]+(-?\d{1,3}\.\d+)/;
  const decMatch = str.match(decRegex);
  if (decMatch) {
    let n1 = parseFloat(decMatch[1]);
    let n2 = parseFloat(decMatch[2]);
    // Determine lat and lng:
    // If one is around Paraguay lat (-18 to -28) and one is lng (-54 to -63)
    let lat = n1, lng = n2;
    if (Math.abs(n1) > Math.abs(n2) && n1 < -40 && n2 > -35) {
      // Swapped lng, lat
      lat = n2;
      lng = n1;
    }
    return { type: 'decimal_degrees', lat, lng, label: `Coord: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, original: str };
  }

  return null;
}

// Test sample inputs
const tests = [
  'https://maps.app.goo.gl/bWXxCDQcJ5nvGY3h9',
  '25°18\'10.2"S 57°30\'48.1"W',
  '25°18\'10.2"S, 57°30\'48.1"W',
  '-25.302609, -57.513558',
  '-25.302609 -57.513558',
  '-57.513558, -25.302609', // inverted
  'https://www.google.com/maps/place/Alberdi+1128,+Asunci%C3%B3n/@-25.2888951,-57.6422439,17z/data=!3m1!4b1!4m6!3m5!1s0x945da7f7a082501f:0x99db6c1b5d8f570!8m2!3d-25.2887219!4d-57.6410239!16s'
];

for (const t of tests) {
  const res = await parseCoordinateInput(t);
  console.log(`\nInput: "${t}"`);
  console.log('Result:', res);
}
