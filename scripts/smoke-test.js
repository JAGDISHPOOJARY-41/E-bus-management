// Smoke test: boots the app with a mocked DB connection and exercises all routes.
// Usage: node scripts/smoke-test.js
process.env.NODE_ENV = 'test';
const config = require('../src/config');
const { createApp } = require('../src/app');
const User = require('../src/models/User');

// Mock the mongoose model methods so no DB is needed.
User.findOne = async () => null;
User.create = async (data) => ({ ...data, _id: '507f1f77bcf86cd799439011' });
User.findById = async () => null;
User.findByIdAndUpdate = async () => ({ id: 'x', fullName: 'a', phone: 'b', city: 'c' });

const app = createApp();
const server = app.listen(config.port, async () => {
  const base = `http://localhost:${config.port}`;
  const post = (url, body) =>
    fetch(base + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  const r1 = await post('/api/register', { fullName: 'A B', email: 'a@b.co', password: '123456' });
  console.log('register:', r1.status, await r1.json());

  const r2 = await post('/api/login', { email: 'a@b.co', password: '123456' });
  console.log('login:', r2.status, await r2.json());

  const r3 = await post('/api/login', { email: 'a@b.co' });
  console.log('login (missing pass):', r3.status, await r3.json());

  const r4 = await post('/api/register', { fullName: 'A B', email: 'bad', password: '123456' });
  console.log('register (bad email):', r4.status, await r4.json());

  const r5 = await fetch(base + '/api/user');
  console.log('user (no auth):', r5.status, await r5.json());

  const r6 = await post('/api/logout', {});
  console.log('logout:', r6.status, await r6.json());

  const r7 = await fetch(base + '/api/unknown');
  console.log('404:', r7.status, await r7.json());

  server.close();
  console.log('✅ smoke test finished');
});
