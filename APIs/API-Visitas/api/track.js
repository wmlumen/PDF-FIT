const express = require('express');
const router = express.Router();
const UAParser = require('ua-parser-js');
const { getProjectId, insertVisit } = require('../db/database');
const { isBot } = require('../middlewares/botFilter');
const crypto = require('crypto');

// Cache simple de geolocalización para evitar rate-limit en ip-api.com
const geoCache = new Map();
const GEO_CACHE_TTL = 60 * 60 * 1000; // 1 hora

// Cola de geolocalización para no exceder 45 req/min de ip-api.com
const geoQueue = [];
let processing = false;
let lastRequestTime = 0;
const MIN_INTERVAL = 1400; // ~42 req/min para mantener margen

/**
 * Obtiene geolocalización de una IP usando ip-api.com (gratuito, sin key)
 */
async function getGeoLocation(ip) {
  // Localhost / IPs privadas
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { country: 'Local', region: '', city: 'Localhost', lat: null, lon: null, isp: 'Local' };
  }

  // Cache
  const cached = geoCache.get(ip);
  if (cached && (Date.now() - cached.timestamp) < GEO_CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,isp,query`);
    const data = await response.json();

    if (data.status === 'success') {
      const result = {
        country: data.country || '',
        region: data.regionName || '',
        city: data.city || '',
        lat: data.lat || null,
        lon: data.lon || null,
        isp: data.isp || ''
      };
      geoCache.set(ip, { data: result, timestamp: Date.now() });
      return result;
    }
  } catch (err) {
    console.error('Geo error:', err.message);
  }

  return { country: '', region: '', city: '', lat: null, lon: null, isp: '' };
}

/**
 * Procesa la cola de geolocalización secuencialmente con rate-limit
 */
async function processGeoQueue() {
  if (processing || geoQueue.length === 0) return;
  processing = true;

  while (geoQueue.length > 0) {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_INTERVAL) {
      await new Promise(r => setTimeout(r, MIN_INTERVAL - elapsed));
    }

    const { ip, resolve } = geoQueue.shift();
    lastRequestTime = Date.now();
    const result = await getGeoLocation(ip);
    resolve(result);
  }

  processing = false;
}

function enqueueGeo(ip) {
  return new Promise((resolve) => {
    geoQueue.push({ ip, resolve });
    processGeoQueue();
  });
}

/**
 * Genera un hash único para el visitante (IP + User-Agent)
 */
function getVisitorHash(ip, userAgent) {
  const raw = `${ip}|${userAgent}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

/**
 * GET /track?project=nombre&page=url
 * Endpoint principal: registra una visita y devuelve datos del visitante.
 * Soporta JSONP (callback=nombre) para uso como script.
 */
router.get('/', async (req, res) => {
  const project = req.query.project || 'default';
  const page = req.query.page || '';
  const callback = req.query.callback; // JSONP support
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || '';
  const referrer = req.headers['referer'] || '';

  // Detectar bot
  const bot = isBot(ip, userAgent);

  // Parsear User-Agent
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser().name || 'Unknown';
  const os = parser.getOS().name || 'Unknown';
  const device = parser.getDevice().type || 'desktop';
  const visitorHash = getVisitorHash(ip, userAgent);

  // Geolocalización
  const geo = await enqueueGeo(ip);

  try {
    const projectId = getProjectId(project);
    insertVisit({
      projectId,
      page,
      ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      lat: geo.lat,
      lon: geo.lon,
      isp: geo.isp,
      browser,
      os,
      device,
      referrer,
      visitorHash,
      isBot: bot
    });
  } catch (err) {
    console.error('Error inserting visit:', err.message);
  }

  // Respuesta
  const responseData = {
    success: true,
    project,
    page,
    visitor: {
      country: geo.country,
      region: geo.region,
      city: geo.city,
      lat: geo.lat,
      lon: geo.lon,
      isp: geo.isp,
      browser,
      os,
      device
    },
    bot_detected: bot
  };

  // JSONP support
  if (callback) {
    res.setHeader('Content-Type', 'text/javascript');
    res.send(`${callback}(${JSON.stringify(responseData)});`);
  } else {
    res.json(responseData);
  }
});

module.exports = router;
