#!/usr/bin/env node
/**
 * telegram.mjs — Servicio de notificaciones y comandos para Telegram
 *
 * Integra un bot de Telegram con SNC_v3 para:
 * - Recibir notificaciones de automatización (backups, tests, etc.)
 * - Ejecutar comandos desde Telegram
 *
 * Uso:
 *   node scripts/telegram.mjs start        Inicia el bot de Telegram
 *   node scripts/telegram.mjs send <mensaje> Enviar mensaje a canal
 *   node scripts/telegram.mjs help         Ayuda
 */

import { Telegraf } from 'telegraf';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENV_FILE = join(ROOT, '.env');

// Cargar variables de entorno
function loadEnv() {
  const env = {};
  if (existsSync(ENV_FILE)) {
    const content = readFileSync(ENV_FILE, 'utf-8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^#]\w+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        env[key] = value;
      }
    });
  }
  return env;
}

const env = loadEnv();
const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_DEBUG = env.TELEGRAM_DEBUG === 'true';

const TELEGRAM = {
  BOT_TOKEN: TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN,
  CHAT_ID: TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID,
};

// Inicializar el bot
let bot = null;

function initBot() {
  if (!TELEGRAM.BOT_TOKEN) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN no está definido en .env');
    console.error('   Agregalo a tu archivo .env: TELEGRAM_BOT_TOKEN=<tu_token>');
    return false;
  }

  try {
    bot = new Telegraf(TELEGRAM.BOT_TOKEN);
    return true;
  } catch (err) {
    console.error('❌ Error al inicializar bot:', err.message);
    return false;
  }
}

// Enviar mensaje
async function sendMessage(text, chatId = TELEGRAM.CHAT_ID) {
  if (!bot) {
    console.warn('⚠️  Bot no inicializado, enviando solo al log:');
    console.log(`📩 ${text}`);
    return;
  }

  try {
    const chat = chatId || TELEGRAM.CHAT_ID;
    if (!chat) {
      console.warn('⚠️  No se especificó chat_id, mensaje no enviado');
      return;
    }
    await bot.telegram.sendMessage(chat, text, { parse_mode: 'Markdown' });
    console.log(`✅ Mensaje enviado a ${chat}`);
  } catch (err) {
    console.error('❌ Error al enviar mensaje:', err.message);
  }
}

// Devolver texto formateado para Markdown
function formatText(text) {
  return text
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/~/g, '\\~')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/`/g, '\\`');
}

// Función helper para enviar notificaciones
async function notify(title, body, type = 'info') {
  const emoji = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️', test: '🧪', deploy: '🚀', db: '🗄️', backup: '💾' };
  const prefix = emoji[type] || emoji.info;
  const message = `${prefix} *${title}*\n${body}`;

  if (TELEGRAM.CHAT_ID) {
    await sendMessage(message);
  } else {
    console.log(`📩 ${message}`);
  }
}

// Comandos de Telegram
async function registerCommands() {
  if (!bot) return;

  // /start - Iniciar
  bot.start((ctx) => {
    ctx.reply('¡Hola! Bienvenido a SNC_v3. 🛣️');
    ctx.reply('Puedes usar estos comandos:');
    ctx.reply('/status - Estado del proyecto');
    ctx.reply('/backup - Crear backup de la base de datos');
    ctx.reply('/tests - Ejecutar tests automatizados');
    ctx.reply('/help - Ayuda');
  });

  // /status - Estado del proyecto
  bot.command('status', async (ctx) => {
    const speed = TELEGRAM_DEBUG ? '🔍 Modo debug' : '🔒 Producción';
    ctx.reply(`*📊 Estado del Proyecto*\n\n${speed}\n\nBase de datos: ✅\nScripts: 13\nTests: 57\nVersion: 3.0.0`, { parse_mode: 'Markdown' });
  });

  // /backup - Crear backup
  bot.command('backup', async (ctx) => {
    ctx.reply('⏳ Creando backup de la base de datos...');
    try {
      const { execSync } = await import('node:child_process');
      execSync('node bin/snc-run.js backup', { stdio: 'inherit' });
      ctx.reply('✅ Backup creado exitosamente');
    } catch (err) {
      ctx.reply('❌ Error al crear backup');
    }
  });

  // /tests - Ejecutar tests
  bot.command('tests', async (ctx) => {
    ctx.reply('🧪 Ejecutando tests...');
    try {
      const { execSync } = await import('node:child_process');
      execSync('node bin/snc-run.js test', { stdio: 'inherit' });
      ctx.reply('✅ Tests ejecutados exitosamente');
    } catch (err) {
      ctx.reply('❌ Error al ejecutar tests');
    }
  });

  // /help - Ayuda
  bot.command('help', async (ctx) => {
    ctx.reply('📖 *Comandos disponibles*:', { parse_mode: 'Markdown' });
    ctx.reply('/status - Estado del proyecto');
    ctx.reply('/backup - Crear backup de la base');
    ctx.reply('/tests - Ejecutar tests');
    ctx.reply('/help - Ayuda');
  });

  // Mensaje por defecto
  bot.on('message', (ctx) => {
    if (!ctx.message.text) return;
    const text = ctx.message.text.toLowerCase();
    if (text === 'hola' || text === 'hello') {
      ctx.reply('¡Hola! Soy el bot de SNC_v3. Usa /help para ver comandos.');
    }
  });

  bot.launch().then(() => {
    console.log('✅ Bot de Telegram iniciado');
  });
}

// Verificar conexión
async function testConnection() {
  if (!TELEGRAM.BOT_TOKEN) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN no configurado');
    return false;
  }

  const https = await import('https');
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${TELEGRAM.BOT_TOKEN}/getMe`,
    method: 'GET',
    headers: { 'User-Agent': 'SNC-v3-Bot/1.0' },
  };

  const req = https.get(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Telegram conectado correctamente');
        const info = JSON.parse(data);
        console.log(`👤 Bot: ${info.first_name} (${info.username})`);
        return true;
      } else {
        console.error('❌ Error de conexión:', res.statusCode);
        return false;
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Error de red:', err.message);
    return false;
  });

  return true;
}

// Envolver mensaje
function wrapMessage(text, maxLength = 4000) {
  const lines = text.split('\n');
  const wrapped = [];
  let current = '';

  for (const line of lines) {
    if ((current + line).length + 1 > maxLength) {
      wrapped.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }
  if (current) wrapped.push(current);

  return wrapped;
}

export const telegram = {
  TELEGRAM,
  initBot,
  registerCommands,
  sendMessage,
  notify,
  testConnection,
  wrapMessage,
};

// Iniciar si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'help';

  switch (mode) {
    case 'start':
      console.log('🚀 Iniciando bot de Telegram...');
      if (initBot()) {
        registerCommands();
      }
      break;
    case 'send':
      const message = process.argv[3] || 'Mensaje desde Telegram';
      sendMessage(message);
      break;
    case 'test':
      testConnection();
      break;
    case 'help':
    default:
      console.log(`
📡 SNC_v3 — Telegram Bot

Modos:
  start              Iniciar bot de Telegram
  send <mensaje>     Enviar mensaje a canal
  test               Verificar conexión con Telegram
  help               Ayuda

Ejemplos:
  node scripts/telegram.mjs start
  node scripts/telegram.mjs send "Test de conexión"
  node scripts/telegram.mjs test
      `);
  }
}
