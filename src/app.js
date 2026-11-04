// Express wiring only (SRP). Router + middleware + centralized error handler.
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { authMiddleware, adminMiddleware, driverMiddleware } = require('./middleware/auth');
const ctrl = require('./controllers/authController');
const driverCtrl = require('./controllers/driverController');
const adminCtrl = require('./controllers/adminController');
const driverPanelCtrl = require('./controllers/driverPanelController');
const busCtrl = require('./controllers/busController');
const { AppError } = require('./errors/AppError');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.post('/api/register', ctrl.register);
  app.post('/api/driver/register', ctrl.registerDriver);
  app.post('/api/login', ctrl.login);
  app.post('/api/logout', ctrl.logout);
  app.get('/api/user', authMiddleware, ctrl.getUser);
  app.put('/api/user', authMiddleware, ctrl.updateUser);

  app.get('/api/buses/search', authMiddleware, busCtrl.search);
  app.get('/api/buses/:id', authMiddleware, busCtrl.getById);
  app.get('/api/locations/:busId', authMiddleware, busCtrl.getLocation);
  app.get('/api/predictions/:busId', authMiddleware, busCtrl.prediction);

  app.get('/api/admin/stats', adminMiddleware, adminCtrl.stats);
  app.get('/api/admin/drivers', adminMiddleware, adminCtrl.listDrivers);
  app.post('/api/admin/drivers', adminMiddleware, adminCtrl.createDriver);
  app.put('/api/admin/drivers/:id', adminMiddleware, adminCtrl.updateDriver);
  app.delete('/api/admin/drivers/:id', adminMiddleware, adminCtrl.deleteDriver);
  app.get('/api/admin/buses', adminMiddleware, adminCtrl.listBuses);
  app.post('/api/admin/buses', adminMiddleware, adminCtrl.createBus);
  app.put('/api/admin/buses/:id', adminMiddleware, adminCtrl.updateBus);
  app.delete('/api/admin/buses/:id', adminMiddleware, adminCtrl.deleteBus);
  app.get('/api/admin/users', adminMiddleware, adminCtrl.listUsers);

  app.get('/api/driver/profile', driverMiddleware, driverPanelCtrl.profile);
  app.get('/api/driver/bus', driverMiddleware, driverPanelCtrl.bus);
  app.put('/api/driver/bus/status', driverMiddleware, driverPanelCtrl.updateStatus);
  app.post('/api/driver/tracking', driverMiddleware, driverPanelCtrl.trackingEvent);
  app.post('/api/locations', driverMiddleware, driverPanelCtrl.createLocation);

  // Admin fleet management. Driver and bus details are stored in MongoDB.
  app.get('/api/drivers', adminMiddleware, driverCtrl.listDrivers);
  app.post('/api/drivers', adminMiddleware, driverCtrl.createDriver);
  app.patch('/api/drivers/:id', adminMiddleware, driverCtrl.updateDriver);

  // Location search and nearby public-transport stops. These endpoints proxy
  // the public OpenStreetMap services so browser CORS policies do not block it.
  app.get('/api/location/search', async (req, res, next) => {
    try {
      const query = String(req.query.q || '').trim();
      if (!query) return res.status(400).json({ success: false, message: 'Location is required.' });

      const response = await fetch(`${NOMINATIM_URL}?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query + ', Bengaluru')}`, {
        headers: { 'User-Agent': 'Wayfinder-EBus/1.0 contact@example.com' },
      });
      if (!response.ok) throw new Error(`Geocoding service returned ${response.status}`);
      const results = await response.json();
      if (!results.length) return res.status(404).json({ success: false, message: 'Location not found in Bengaluru.' });

      res.json({ success: true, location: {
        name: results[0].display_name,
        lat: Number(results[0].lat),
        lon: Number(results[0].lon),
      } });
    } catch (err) {
      next(new AppError(502, 'Location search is temporarily unavailable.'));
    }
  });

  app.get('/api/bus-stops', async (req, res, next) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
      }

      const query = `[out:json][timeout:15];(node[highway=bus_stop](around:3000,${lat},${lon});node[public_transport=platform](around:3000,${lat},${lon}););out body;`;
      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'User-Agent': 'Wayfinder-EBus/1.0 contact@example.com' },
        body: query,
      });
      if (!response.ok) throw new Error(`Transit service returned ${response.status}`);
      const data = await response.json();
      const stops = data.elements.map((stop) => ({
        id: stop.id,
        name: stop.tags?.name || 'Bus stop',
        lat: stop.lat,
        lon: stop.lon,
      }));
      res.json({ success: true, stops });
    } catch (err) {
      next(new AppError(502, 'Nearby bus stops are temporarily unavailable.'));
    }
  });

  // 404 for unknown API routes
  app.use('/api', (req, res, next) => next(new AppError(404, 'Route not found')));

  // Centralized error handler (DRY) — replaces 4 duplicated try/catch blocks.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err.statusCode || 500;
    if (status >= 500) console.error('❌ Unhandled error:', err?.stack || err);
    res.status(status).json({
      success: false,
      message: err.isOperational ? err.message : 'Something went wrong. Please try again.',
    });
  });

  return app;
}

module.exports = { createApp };
