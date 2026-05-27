/**
 * Filtro de bots/crawlers para evitar que inflen las estadísticas.
 * Detecta por User-Agent, patrones headless, y rangos de IPs de datacenters conocidos.
 */

// Patrones de User-Agent de bots conocidos
const BOT_PATTERNS = [
  // Crawlers de buscadores
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'facebot', 'facebookexternalhit', 'twitterbot',
  'rogerbot', 'linkedinbot', 'embedly', 'quora link preview',
  'showyoubot', 'outbrain', 'pinterest', 'slackbot',
  'vkshare', 'w3c_validator', 'redditbot', 'applebot',
  'whatsapp', 'flipboard', 'tumblr', 'bitlybot',
  'semrushbot', 'ahrefsbot', 'dotbot', 'mj12bot',
  'seznambot', 'sogou', 'exabot', 'ia_archiver',
  'ichiro', 'gigabot', 'psbot', 'spider',
  // AI/ChatGPT crawlers
  'gptbot', 'claude', 'anthropic', 'perplexity',
  'bytespider', 'cohere', 'ai2bot',
  // Tools
  'curl', 'wget', 'python-requests', 'python-urllib',
  'go-http-client', 'java/', 'okhttp', 'httpx',
  'axios', 'node-fetch', 'aiohttp',
  // Headless browsers
  'headless', 'puppeteer', 'playwright', 'selenium',
  'phantomjs', 'htmlunit', 'mechanize',
];

// Rangos de IPs de datacenters conocidos (CIDR simplificado)
// Se cachean después de obtener de ip-api.com
const DATACENTER_IPS = new Set([
  // AWS
  '3.', '4.', '13.', '15.', '16.', '18.', '34.', '35.',
  '44.', '52.', '54.', '99.', '100.', '104.', '108.',
  '140.', '150.', '175.', '176.', '184.', '185.', '205.',
  // Google Cloud
  '8.', '23.', '34.', '35.', '104.', '107.', '108.',
  '130.', '142.', '146.', '162.', '172.', '173.',
  // Azure
  '13.', '20.', '23.', '40.', '51.', '52.', '65.',
  '70.', '104.', '137.', '138.', '157.', '168.',
  // DigitalOcean
  '64.', '67.', '68.', '104.', '105.', '106.', '107.',
  '128.', '134.', '137.', '138.', '139.', '142.',
  '143.', '144.', '145.', '146.', '147.', '148.',
  '149.', '150.', '151.', '152.', '153.', '154.',
  '155.', '156.', '157.', '158.', '159.', '160.',
  '161.', '162.', '163.', '164.', '165.', '166.',
  '167.', '168.', '169.', '170.', '171.', '172.',
  '173.', '174.', '175.', '176.', '177.', '178.',
  '179.', '180.', '181.', '182.', '183.', '184.',
  '185.', '186.', '187.', '188.', '189.', '190.',
  '191.', '192.', '193.', '194.', '195.', '196.',
  '198.', '199.', '203.',
  // OVH
  '37.', '46.', '51.', '54.', '57.', '91.', '92.',
  '94.', '95.', '144.', '145.', '146.', '147.', '148.',
  '149.', '151.', '152.', '158.', '167.', '176.', '178.',
  '185.', '186.', '188.', '193.', '194.', '198.', '213.',
  // Hetzner
  '5.', '23.', '37.', '46.', '49.', '65.', '78.',
  '85.', '88.', '91.', '93.', '94.', '95.', '116.',
  '128.', '130.', '135.', '136.', '138.', '142.',
  '144.', '148.', '149.', '154.', '157.', '159.',
  '162.', '163.', '164.', '167.', '168.', '172.',
  '173.', '176.', '178.', '185.', '188.', '193.',
  '194.', '195.', '213.',
  // Vultr
  '45.', '66.', '67.', '68.', '95.', '104.', '107.',
  '108.', '128.', '136.', '137.', '139.', '141.',
  '144.', '149.', '155.', '207.', '216.', '217.',
  // Linode
  '45.', '50.', '66.', '69.', '72.', '74.', '96.',
  '97.', '104.', '106.', '139.', '143.', '162.',
  '172.', '173.', '192.', '198.', '216.',
]);

function isBot(ip, userAgent) {
  if (!userAgent || !ip) return false;

  const ua = userAgent.toLowerCase();

  // 1. Detectar por User-Agent
  for (const pattern of BOT_PATTERNS) {
    if (ua.includes(pattern)) return true;
  }

  // 2. Detectar por IP de datacenter
  for (const prefix of DATACENTER_IPS) {
    if (ip.startsWith(prefix)) {
      // Si además no tiene un User-Agent de navegador real, es probablemente bot
      const hasRealBrowser = ua.includes('mozilla') || 
                            ua.includes('chrome') || 
                            ua.includes('safari') ||
                            ua.includes('firefox') ||
                            ua.includes('edge') ||
                            ua.includes('opera');
      if (!hasRealBrowser) return true;
      break;
    }
  }

  // 3. Sin User-Agent
  if (ua.length < 10) return true;

  return false;
}

module.exports = { isBot };
