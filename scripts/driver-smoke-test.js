// Live driver-panel smoke test. Start the app first with: npm start
require('dotenv').config();
const mongoose = require('mongoose');
const Driver = require('../src/models/Driver');
const Bus = require('../src/models/Bus');
const Location = require('../src/models/Location');

const base = 'http://127.0.0.1:3000';
async function request(path, options = {}, cookie = '') {
  const response = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) } });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
function assert(condition, message) { if (!condition) throw new Error(message); }

(async () => {
  const suffix = Date.now();
  const driverEmail = `driver-smoke-${suffix}@local.test`;
  const busNumber = `SMOKE-${suffix}`;
  let driverId; let busId;
  try {
    const admin = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'admin@local.test', password: 'Admin123!' }) });
    assert(admin.status === 200, 'admin login failed');
    const createdDriver = await request('/api/admin/drivers', { method: 'POST', body: JSON.stringify({ firstName: 'Smoke', lastName: 'Driver', email: driverEmail, phone: '9999999999', travelAgency: 'Smoke Agency', password: 'Driver123!' }) }, admin.cookie);
    assert(createdDriver.status === 201, 'driver creation failed'); driverId = createdDriver.data.driver.id;
    const createdBus = await request('/api/admin/buses', { method: 'POST', body: JSON.stringify({ busNumber, busType: 'Express', source: 'Ballari', destination: 'Bengaluru', sourceTime: '08:30', destinationTime: '11:45', driver: driverId, contactNumber: '8888888888', status: 'On Time' }) }, admin.cookie);
    assert(createdBus.status === 201, 'bus creation failed'); busId = createdBus.data.bus.id;
    const login = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: driverEmail, password: 'Driver123!' }) });
    assert(login.status === 200 && login.data.user.role === 'driver', 'driver login failed');
    const assigned = await request('/api/driver/bus', {}, login.cookie); assert(assigned.status === 200 && assigned.data.bus.id === busId, 'assigned bus failed');
    const status = await request('/api/driver/bus/status', { method: 'PUT', body: JSON.stringify({ status: 'Delayed' }) }, login.cookie); assert(status.status === 200, 'status update failed');
    const invalid = await request('/api/locations', { method: 'POST', body: JSON.stringify({ busId, latitude: 200, longitude: 76, speed: 20 }) }, login.cookie); assert(invalid.status === 400, 'invalid location was accepted');
    const location = await request('/api/locations', { method: 'POST', body: JSON.stringify({ busId, latitude: 15.1394, longitude: 76.9214, speed: 42 }) }, login.cookie); assert(location.status === 201, 'location update failed');
    const normal = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'a@b.co', password: '123456' }) });
    const search = await request('/api/buses/search?source=Ballari&destination=Bengaluru', {}, normal.cookie); assert(search.status === 200 && search.data.buses.some((bus) => String(bus.id) === String(busId)), 'user bus search failed');
    const userLocation = await request('/api/locations/' + busId, {}, normal.cookie); assert(userLocation.status === 200 && userLocation.data.location, 'user location lookup failed');
    const userPrediction = await request('/api/predictions/' + busId, {}, normal.cookie); assert(userPrediction.status === 200 && userPrediction.data.etaAvailable === false, 'prediction should be unavailable without distance data');
    const denied = await request('/api/driver/bus', {}, normal.cookie); assert(denied.status === 403, 'normal user was not denied');
    console.log('driver smoke test passed');
  } finally {
    await mongoose.connect(process.env.MONGO_URI);
    const driver = await Driver.findOne({ email: driverEmail }).select('_id');
    if (driver) { await Location.deleteMany({ driver: driver._id }); await Bus.deleteMany({ driver: driver._id }); await Driver.deleteOne({ _id: driver._id }); }
    await mongoose.disconnect();
  }
})().then(() => process.exit(0)).catch((error) => { console.error(error.message); process.exit(1); });
