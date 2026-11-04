// Centralized configuration — single source of truth (DRY).
// Loads .env, then reads env vars with dev fallbacks; never hardcode in prod.
require('dotenv').config();

module.exports = Object.freeze({
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/E-bus',
  jwt: {
    secret: process.env.JWT_SECRET || 'wayfinder_ebus_secret_key_2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },
  bcryptRounds: 10,
  cookieName: 'token',
  isProd: process.env.NODE_ENV === 'production',
});
