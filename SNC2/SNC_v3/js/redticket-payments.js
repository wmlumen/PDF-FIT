import crypto from 'node:crypto';

export function redticketSign(body, secretKey) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secretKey).update(body).digest('hex');
  return expected;
}

export function verifyRedTicketSignature(body, signature, secretKey) {
  if (!signature || !secretKey) return false;
  const expected = redticketSign(body, secretKey);
  if (!expected) return false;
  const sigs = String(signature).split(',').map(s => s.trim()).filter(Boolean);
  return sigs.some(sig => {
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return expected === sig;
    }
  });
}

export function verifyWebhook(body, signature, timestamp, webhookSecretKey) {
  if (!webhookSecretKey) return false;
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  return verifyRedTicketSignature(body, signature, webhookSecretKey);
}

export function buildChargePayload({ amount, currency = 'PYG', description, external_ref, metadata = {}, webhook_url, success_url, failure_url, expires_in = 1800 }) {
  const payload = { amount, currency, description, external_ref, metadata, webhook_url, success_url, failure_url, expires_in };
  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

export function parseWebhookBody(body) {
  try {
    const event = JSON.parse(body);
    if (!event || !event.event || !event.data) return null;
    return event;
  } catch {
    return null;
  }
}
