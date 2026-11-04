const mongoose = require('mongoose');
const Bus = require('../models/Bus');
const Location = require('../models/Location');
const { AppError } = require('../errors/AppError');

function routePattern(value) { return new RegExp(`^${String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'); }

function publicBus(bus) {
  const hasLocation = bus.trackingActive && Number.isFinite(bus.currentLatitude) && Number.isFinite(bus.currentLongitude);
  return { id: bus._id, busNumber: bus.busNumber, busType: bus.busType, source: bus.source, destination: bus.destination, sourceTime: bus.sourceTime || '', destinationTime: bus.destinationTime || '', contactNumber: bus.contactNumber, status: bus.status, trackingActive: Boolean(bus.trackingActive), driver: bus.driver ? { id: bus.driver._id, fullName: bus.driver.fullName, phone: bus.driver.phone, travelAgency: bus.driver.travelAgency } : null, currentLocation: hasLocation ? { latitude: bus.currentLatitude, longitude: bus.currentLongitude, speed: bus.currentSpeed || 0, lastUpdated: bus.lastLocationAt } : null };
}

async function search(req, res, next) {
  try {
    const source = String(req.query.source || '').trim(); const destination = String(req.query.destination || '').trim();
    if (!source || !destination) throw new AppError(400, 'Source and destination are required.');
    const buses = await Bus.find({ source: routePattern(source), destination: routePattern(destination), status: { $ne: 'Inactive' } }).populate('driver', 'fullName phone travelAgency').sort({ createdAt: -1 });
    res.json({ success: true, buses: buses.map(publicBus) });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'Bus not found.');
    const bus = await Bus.findById(req.params.id).populate('driver', 'fullName phone travelAgency');
    if (!bus) throw new AppError(404, 'Bus not found.');
    res.json({ success: true, bus: publicBus(bus) });
  } catch (err) { next(err); }
}

async function getLocation(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.busId)) throw new AppError(404, 'Bus not found.');
    const bus = await Bus.findById(req.params.busId).select('driver trackingActive');
    if (!bus) throw new AppError(404, 'Bus not found.');
    if (req.user.role === 'driver' && String(bus.driver) !== String(req.user.id)) throw new AppError(403, 'You can only view your assigned bus location.');
    const location = bus.trackingActive ? await Location.findOne({ bus: bus._id }).sort({ createdAt: -1 }).select('-__v') : null;
    res.json({ success: true, trackingActive: Boolean(bus.trackingActive), location: location || null });
  } catch (err) { next(err); }
}

async function prediction(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.busId)) throw new AppError(404, 'Bus not found.');
    const bus = await Bus.findById(req.params.busId).select('driver currentSpeed trackingActive');
    if (!bus) throw new AppError(404, 'Bus not found.');
    if (req.user.role === 'driver' && String(bus.driver) !== String(req.user.id)) throw new AppError(403, 'You can only view your assigned bus prediction.');
    const location = bus.trackingActive ? await Location.findOne({ bus: bus._id }).sort({ createdAt: -1 }).select('speed distanceRemaining createdAt') : null;
    if (!location || !Number.isFinite(location.distanceRemaining) || location.distanceRemaining <= 0 || !Number.isFinite(location.speed) || location.speed <= 0) return res.json({ success: true, etaAvailable: false, message: 'ETA currently unavailable.' });
    const etaMinutes = Math.max(1, Math.round(location.distanceRemaining / (location.speed * 1000 / 60)));
    res.json({ success: true, etaAvailable: true, etaMinutes, estimatedArrival: new Date(Date.now() + etaMinutes * 60000), basedOn: { distanceRemaining: location.distanceRemaining, speed: location.speed, locationUpdatedAt: location.createdAt } });
  } catch (err) { next(err); }
}

module.exports = { search, getById, getLocation, prediction };
