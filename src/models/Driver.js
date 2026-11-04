const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  firstName: { type: String, trim: true, required: true },
  lastName: { type: String, trim: true, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  travelAgency: { type: String, trim: true, default: '' },
  password: { type: String, required: true },
  role: { type: String, enum: ['driver'], default: 'driver' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, { toJSON: { virtuals: false, transform: (_doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.password; delete ret.__v; return ret; } } });

module.exports = mongoose.model('Driver', driverSchema, 'drivers');
