const Driver = require('../models/Driver');
const { AppError } = require('../errors/AppError');

function validateDriver(body) {
  const required = ['fullName', 'email', 'phone', 'licenseNumber', 'busNumber', 'busType', 'routeName', 'source', 'destination', 'seatingCapacity'];
  const missing = required.find((field) => !String(body[field] ?? '').trim());
  if (missing) throw new AppError(400, `${missing.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)} is required.`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) throw new AppError(400, 'Please enter a valid driver email address.');
  if (!Number.isInteger(Number(body.seatingCapacity)) || Number(body.seatingCapacity) < 1) throw new AppError(400, 'Seating capacity must be a positive number.');
}

async function listDrivers(_req, res, next) {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json({ success: true, drivers });
  } catch (err) { next(err); }
}

async function createDriver(req, res, next) {
  try {
    validateDriver(req.body);
    const driver = await Driver.create({ ...req.body, seatingCapacity: Number(req.body.seatingCapacity) });
    res.status(201).json({ success: true, message: 'Driver and bus details registered successfully.', driver });
  } catch (err) { next(err); }
}

async function updateDriver(req, res, next) {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!driver) throw new AppError(404, 'Driver record not found.');
    res.json({ success: true, message: 'Driver status updated.', driver });
  } catch (err) { next(err); }
}

module.exports = { listDrivers, createDriver, updateDriver };
