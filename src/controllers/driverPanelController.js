const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const Location = require('../models/Location');
const { AppError } = require('../errors/AppError');
const logger = require('../utils/logger');

const statuses = ['Active', 'Inactive', 'On Time', 'Delayed'];

async function getDriver(req) {
  const driver = await Driver.findOne({ _id: req.user.id, active: { $ne: false } }).select('-password');
  if (!driver) throw new AppError(404, 'Driver profile not found.');
  return driver;
}

async function getAssignedBus(driverId) {
  const bus = await Bus.findOne({ driver: driverId }).populate('driver', 'fullName email phone');
  if (!bus) throw new AppError(404, 'No bus assigned to this driver.');
  return bus;
}

function publicDriver(driver) {
  return { id: driver._id, fullName: driver.fullName, firstName: driver.firstName, lastName: driver.lastName, email: driver.email, phone: driver.phone, travelAgency: driver.travelAgency, role: driver.role };
}

function publicBus(bus) {
  return { id: bus._id, busNumber: bus.busNumber, registrationNumber: bus.busNumber, busType: bus.busType, source: bus.source, destination: bus.destination, contactNumber: bus.contactNumber, status: bus.status, currentLatitude: bus.currentLatitude, currentLongitude: bus.currentLongitude, currentSpeed: bus.currentSpeed, lastLocationAt: bus.lastLocationAt };
}

async function profile(req, res, next) { try { const driver = await getDriver(req); res.json({ success: true, driver: publicDriver(driver) }); } catch (err) { next(err); } }
async function bus(req, res, next) { try { const assigned = await getAssignedBus(req.user.id); logger.info('Driver viewed assigned bus', String(req.user.id)); res.json({ success: true, bus: publicBus(assigned) }); } catch (err) { next(err); } }

async function updateStatus(req, res, next) {
  try {
    if (!statuses.includes(req.body.status)) throw new AppError(400, 'Invalid bus status.');
    const assigned = await getAssignedBus(req.user.id);
    assigned.status = req.body.status;
    await assigned.save();
    logger.info('Driver updated bus status', `${assigned.busNumber} -> ${assigned.status}`);
    res.json({ success: true, message: 'Status updated successfully.', bus: publicBus(assigned) });
  } catch (err) { next(err); }
}

function locationValues(body) {
  const latitude = Number(body.latitude); const longitude = Number(body.longitude); const speed = Number(body.speed ?? 0);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isFinite(speed) || speed < 0) throw new AppError(400, 'Please provide valid latitude, longitude, and speed.');
  return { latitude, longitude, speed, previousStop: String(body.previousStop || '').trim(), previousStopDwellTime: Number(body.previousStopDwellTime || 0), destination: String(body.destination || '').trim(), distanceRemaining: body.distanceRemaining === undefined ? undefined : Number(body.distanceRemaining) };
}

async function createLocation(req, res, next) {
  try {
    const assigned = await getAssignedBus(req.user.id);
    if (String(req.body.busId) !== String(assigned._id)) throw new AppError(403, 'You can only update your assigned bus.');
    const values = locationValues(req.body);
    const location = await Location.create({ ...values, bus: assigned._id, driver: req.user.id });
    assigned.currentLatitude = values.latitude; assigned.currentLongitude = values.longitude; assigned.currentSpeed = values.speed; assigned.lastLocationAt = location.createdAt; assigned.trackingActive = true; assigned.trackingUpdatedAt = location.createdAt;
    await assigned.save();
    logger.info('Driver updated bus location', assigned.busNumber);
    res.status(201).json({ success: true, message: 'Location updated successfully.', location: { id: location._id, latitude: location.latitude, longitude: location.longitude, speed: location.speed, createdAt: location.createdAt } });
  } catch (err) { next(err); }
}

async function listLocations(req, res, next) {
  try {
    const assigned = await getAssignedBus(req.user.id);
    if (String(req.params.busId) !== String(assigned._id)) throw new AppError(403, 'You can only view your assigned bus location.');
    const locations = await Location.find({ bus: assigned._id }).sort({ createdAt: -1 }).limit(20).select('-__v');
    res.json({ success: true, locations });
  } catch (err) { next(err); }
}

async function trackingEvent(req, res, next) {
  try { const assigned = await getAssignedBus(req.user.id); assigned.trackingActive = Boolean(req.body.active); assigned.trackingUpdatedAt = new Date(); await assigned.save(); if (assigned.trackingActive) logger.info('Driver started location tracking', String(req.user.id)); else logger.info('Driver stopped location tracking', String(req.user.id)); res.json({ success: true }); } catch (err) { next(err); }
}

module.exports = { profile, bus, updateStatus, createLocation, listLocations, trackingEvent };
