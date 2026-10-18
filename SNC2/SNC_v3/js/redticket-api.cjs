const crypto = require('node:crypto');

const BASE = process.env.RED_TICKET_BASE_URL || 'https://wallet-v1.redticket.com.py/merchant/v1';
const SECRET_KEY = process.env.RED_TICKET_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.RED_TICKET_WEBHOOK_SECRET || '';
const USERNAME = process.env.RED_TICKET_USERNAME || 'redticket';
const PASSWORD = process.env.RED_TICKET_PASSWORD || '';

const authHeader = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

async function request(path, method = 'GET', body = null, idempotencyKey = '') {
  const url = `${BASE}${path}`;
  const headers = {
    'Authorization': `Basic ${authHeader}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data?.message || `RedTicket ${res.status}`);
  return data;
}

function hasRedTicketConfig() {
  return Boolean(SECRET_KEY && USERNAME && PASSWORD);
}

async function createCharge({ amount, currency, description, external_ref, metadata = {}, webhook_url, success_url, failure_url, idempotencyKey }) {
  const body = {
    amount,
    currency: currency || 'PYG',
    description: description || 'Acceso SNC',
    external_ref,
    metadata,
    webhook_url,
    success_url,
    failure_url
  };
  return request('/charges?filter=create', 'POST', body, idempotencyKey);
}

async function getCharge(chargeId) {
  if (!chargeId) return null;
  return request(`/charges/${encodeURIComponent(chargeId)}`);
}

async function getCheckoutByToken(token) {
  if (!token) return null;
  return request(`/checkouts/${encodeURIComponent(token)}`);
}

function verifyWebhook(body, signature, timestamp, secret) {
  if (!signature || !timestamp || !secret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return signature === expected;
  }
}

module.exports = { hasRedTicketConfig, createCharge, getCharge, getCheckoutByToken, verifyWebhook };
