const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');
const Bus = require('../models/Bus');
const Location = require('../models/Location');
const config = require('../config');
const { AppError } = require('../errors/AppError');
const logger = require('../utils/logger');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const driverFields = ['firstName', 'lastName', 'email', 'phone', 'travelAgency'];
const busTypes = ['Ordinary', 'Express', 'AC', 'Non-AC', 'Electric'];
const busStatuses = ['Active', 'Inactive', 'On Time', 'Delayed'];

function validateDriver(body) {
  if (driverFields.some((field) => !String(body[field] || '').trim())) throw new AppError(400, 'Please fill all required fields.');
  if (!emailPattern.test(String(body.email).trim())) throw new AppError(400, 'Please enter a valid email address.');
}

function validateDriverPassword(body) {
  if (!String(body.password || '').trim() || String(body.password).length < 6) throw new AppError(400, 'Driver password must be at least 6 characters.');
}

function validateBus(body) {
  const required = ['busNumber', 'busType', 'source', 'destination', 'sourceTime', 'destinationTime', 'driver', 'contactNumber'];
  if (required.some((field) => !String(body[field] || '').trim())) throw new AppError(400, 'Please fill all required fields.');
  if (!busTypes.includes(body.busType) || (body.status && !busStatuses.includes(body.status))) throw new AppError(400, 'Invalid bus type or status.');
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(body.sourceTime) || !timePattern.test(body.destinationTime)) throw new AppError(400, 'Please enter valid source and destination times.');
}

function publicDriver(user) {
  const nameParts = String(user.fullName || '').trim().split(/\s+/);
  return { id: String(user._id), firstName: user.firstName || nameParts[0] || '', lastName: user.lastName || nameParts.slice(1).join(' '), name: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' '), email: user.email || '', phone: user.phone || '', travelAgency: user.travelAgency || '', createdAt: user.createdAt };
}

async function stats(_req, res, next) {
  try {
    const [totalUsers, totalDrivers, totalBuses, activeBuses] = await Promise.all([
      User.countDocuments(), Driver.countDocuments({ active: { $ne: false } }), Bus.countDocuments(), Bus.countDocuments({ status: { $ne: 'Inactive' } }),
    ]);
    res.json({ success: true, stats: { totalUsers, totalDrivers, totalBuses, activeBuses } });
  } catch (err) { next(err); }
}

async function listDrivers(_req, res, next) { try { const drivers = await Driver.find({ active: { $ne: false } }).select('-password').sort({ createdAt: -1 }); res.json({ success: true, drivers: drivers.map(publicDriver) }); } catch (err) { next(err); } }

async function createDriver(req, res, next) {
  try {
    validateDriver(req.body);
    validateDriverPassword(req.body);
    const email = req.body.email.trim().toLowerCase();
    if (await Promise.any([User.findOne({ email }), Driver.findOne({ email }), Admin.findOne({ email })].map((query) => query.then(Boolean)))) throw new AppError(409, 'A user with this email already exists.');
    const firstName = req.body.firstName.trim(); const lastName = req.body.lastName.trim();
    const driver = await Driver.create({ fullName: `${firstName} ${lastName}`, firstName, lastName, email, phone: req.body.phone.trim(), travelAgency: req.body.travelAgency.trim(), password: await bcrypt.hash(req.body.password, config.bcryptRounds), role: 'driver' });
    logger.info('Driver added', email);
    res.status(201).json({ success: true, message: 'Driver added successfully.', driver: publicDriver(driver) });
  } catch (err) { next(err); }
}

async function updateDriver(req, res, next) {
  try {
    validateDriver(req.body);
    const driver = await Driver.findOneAndUpdate({ _id: req.params.id, active: { $ne: false } }, { $set: { fullName: `${req.body.firstName.trim()} ${req.body.lastName.trim()}`, firstName: req.body.firstName.trim(), lastName: req.body.lastName.trim(), email: req.body.email.trim().toLowerCase(), phone: req.body.phone.trim(), travelAgency: req.body.travelAgency.trim() } }, { new: true, returnDocument: 'after', runValidators: true }).select('-password');
    if (!driver) throw new AppError(404, 'Driver not found.');
    logger.info('Driver edited', String(driver._id));
    res.json({ success: true, message: 'Driver updated successfully.', driver: publicDriver(driver) });
  } catch (err) { next(err); }
}

async function deleteDriver(req, res, next) { try { const driver = await Driver.findOneAndUpdate({ _id: req.params.id, active: { $ne: false } }, { $set: { active: false } }, { new: true }); if (!driver) throw new AppError(404, 'Driver not found.'); await Bus.updateMany({ driver: driver._id }, { $set: { status: 'Inactive' } }); logger.info('Driver deleted', String(driver._id)); res.json({ success: true, message: 'Driver deleted successfully.' }); } catch (err) { next(err); } }

function publicBus(bus) { return { id: String(bus._id), busNumber: bus.busNumber, busType: bus.busType, source: bus.source, destination: bus.destination, sourceTime: bus.sourceTime || '', destinationTime: bus.destinationTime || '', driver: bus.driver?._id ? String(bus.driver._id) : (bus.driver ? String(bus.driver) : ''), driverName: bus.driver?.fullName || '', contactNumber: bus.contactNumber, status: bus.status, createdAt: bus.createdAt }; }
async function listBuses(_req, res, next) { try { const buses = await Bus.find().populate('driver', 'fullName').sort({ createdAt: -1 }); res.json({ success: true, buses: buses.map(publicBus) }); } catch (err) { next(err); } }
async function createBus(req, res, next) { try { validateBus(req.body); const driver = await Driver.findOne({ _id: req.body.driver, active: { $ne: false } }); if (!driver) throw new AppError(400, 'Please select a valid driver.'); const bus = await Bus.create({ ...req.body, status: req.body.status || 'Active' }); await bus.populate('driver', 'fullName'); logger.info('Bus added', bus.busNumber); res.status(201).json({ success: true, message: 'Bus added successfully.', bus: publicBus(bus) }); } catch (err) { next(err); } }
async function updateBus(req, res, next) { try { if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'Bus not found.'); validateBus(req.body); const driver = await Driver.findOne({ _id: req.body.driver, active: { $ne: false } }); if (!driver) throw new AppError(400, 'Please select a valid driver.'); const bus = await Bus.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).populate('driver', 'fullName'); if (!bus) throw new AppError(404, 'Bus not found.'); logger.info('Bus edited', bus.busNumber); res.json({ success: true, message: 'Bus updated successfully.', bus: publicBus(bus) }); } catch (err) { next(err); } }
async function deleteBus(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(404, 'Bus not found.');
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) throw new AppError(404, 'Bus not found.');

    // Locations belong to a bus and should not be left orphaned after deletion.
    await Location.deleteMany({ bus: bus._id });

    logger.info('Bus deleted', bus.busNumber);
    res.json({ success: true, message: 'Bus deleted successfully.' });
  } catch (err) { next(err); }
}
async function listUsers(_req, res, next) { try { const users = await User.find({ role: 'user' }).select('fullName email createdAt').sort({ createdAt: -1 }); logger.info('Users viewed'); res.json({ success: true, users }); } catch (err) { next(err); } }

module.exports = { stats, listDrivers, createDriver, updateDriver, deleteDriver, listBuses, createBus, updateBus, deleteBus, listUsers };
