import nodemailer from 'nodemailer';
import { ENV } from '../config.env.js';
import { logger } from './logger.js';

let transporter = null;

function buildTransport() {
  if (!ENV.SMTP_HOST || !ENV.SMTP_USER || !ENV.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: String(ENV.SMTP_HOST),
    port: Number(ENV.SMTP_PORT),
    secure: Number(ENV.SMTP_PORT) === 465,
    auth: { user: String(ENV.SMTP_USER), pass: String(ENV.SMTP_PASS) },
  });
}

function getTransporter() {
  if (!transporter) transporter = buildTransport();
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    logger.warn('[MAIL] No SMTP config; skipping email send');
    return false;
  }
  const from = `SNC v3 <${ENV.SMTP_USER}>`;
  await t.sendMail({ from, to, subject, text, html });
  return true;
}

const BRAND = {
  name: 'SNC v3',
  url: 'https://snc.app',
  support: 'soporte@snc.app',
  primary: '#111111',
  surface: '#0a0a0a',
  border: '#262626',
  muted: '#a3a3a3',
  accent: '#ffffff',
};

function wrap(title, intro, cta, footerText) {
  const buttonStyle = "display:inline-block;padding:14px 20px;border-radius:12px;background:#111;border:1px solid #333;color:#fff;text-decoration:none;font-weight:700;font-family:Inter,system-ui,sans-serif;";
  const cardStyle = "max-width:600px;margin:0 auto;background:#0a0a0a;border:1px solid #262626;border-radius:16px;padding:24px;font-family:Inter,system-ui,sans-serif;color:#fff;";
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body style="background:#050505;margin:0;padding:24px;">
  <div style="${cardStyle}">
    <div style="font-size:18px;font-weight:800;letter-spacing:.3px;margin-bottom:8px;">${BRAND.name}</div>
    <h1 style="font-size:22px;margin:0 0 10px;font-weight:700;color:#fff;">${title}</h1>
    <p style="color:#a3a3a3;line-height:1.5;margin:0 0 16px;">${intro}</p>
    ${cta}
    <p style="color:#a3a3a3;line-height:1.5;margin:16px 0 0;font-size:13px;">${footerText || 'Si no fuiste vos, ignorá este correo.'}</p>
    <div style="margin-top:18px;border-top:1px solid #262626;padding-top:12px;font-size:12px;color:#737373;">© ${new Date().getFullYear()} ${BRAND.name}. Todos los derechos reservados.</div>
  </div>
  </body></html>`;
}

function button(href, label) {
  return `<div style="margin:16px 0;"><a href="${href}" style="display:inline-block;padding:14px 20px;border-radius:12px;background:#111;border:1px solid #333;color:#fff;text-decoration:none;font-weight:700;">${label}</a></div>`;
}

function textFallback(body) {
  return `SNC v3\n${'='.repeat(40)}\n${body}\n${'='.repeat(40)}\n© ${new Date().getFullYear()} SNC v3\n`;
}

export async function sendRecoveryEmail({ to, name, recoveryLink }) {
  const title = 'Recuperá tu cuenta';
  const intro = `Hola ${name || ''}, recibimos una solicitud para restablecer la contraseña de tu cuenta en SNC v3. Si fuiste vos, usá el botón de abajo; si no, ignorá este correo.`;
  const ctrHtml = button(recoveryLink, 'Restablecer contraseña');
  const body = `Hola ${name || ''},

Recibimos una solicitud para restablecer tu contraseña.
Usá este enlace: ${recoveryLink}

Este enlace vence en 1 hora.
Si no fuiste vos, ignorá este correo.`;
  return sendMail({ to, subject: title, text: textFallback(body), html: wrap(title, intro, ctrHtml, 'Este enlace vence en 1 hora. Si no fuiste vos, ignorá este correo.') });
}

export async function sendWelcomeEmail({ to, name, role }) {
  const title = 'Bienvenido a SNC v3';
  const intro = `Hola ${name || ''}, tu cuenta fue creada con éxito. Ya podés ingresar al portal con tu correo y contraseña.`;
  const ctrHtml = button(`${BRAND.url}/login`, 'Ingresar al portal');
  const body = `Hola ${name || ''},\nTu cuenta fue creada con rol: ${role || 'member'}.\nAccedé al portal: ${BRAND.url}\n`;
  return sendMail({ to, subject: title, text: textFallback(body), html: wrap(title, intro, ctrHtml) });
}

export async function sendAdminAlert({ to, subject, message }) {
  const title = subject || 'Notificación';
  const intro = String(message || 'Tenés una nueva notificación del sistema.');
  const ctrHtml = button(`${BRAND.url}/admin`, 'Ir al panel admin');
  const body = `${title}\n\n${intro}\n\nPanel: ${BRAND.url}/admin\n`;
  return sendMail({ to, subject: `[SNC v3] ${title}`, text: textFallback(body), html: wrap(title, intro, ctrHtml) });
}

export default { sendRecoveryEmail, sendWelcomeEmail, sendAdminAlert };
