import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5556),
  HOST: process.env.HOST || '0.0.0.0',
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'snc-v3-development-only-change-me'),
  JWT_EXPIRES: process.env.JWT_EXPIRES || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5556,http://localhost:5173,http://127.0.0.1:5556',
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 120),
  RED_TICKET_BASE_URL: process.env.RED_TICKET_BASE_URL || '',
  RED_TICKET_API_KEY: process.env.RED_TICKET_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
};

if (ENV.NODE_ENV === 'production') {
  if (!ENV.JWT_SECRET || /change-me|development-only|snc-v3-development-only/i.test(ENV.JWT_SECRET) || ENV.JWT_SECRET.length < 32) {
    console.error('[BOOT][FATAL] JWT_SECRET inválido o placeholder. Configure un secreto real y reinicie.');
    process.exit(1);
  }
}
