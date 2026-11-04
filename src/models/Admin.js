const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin'], default: 'admin' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, { toJSON: { virtuals: false, transform: (_doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.password; delete ret.__v; return ret; } } });

module.exports = mongoose.model('Admin', adminSchema, 'admins');
