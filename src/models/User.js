// User persistence model (Single Responsibility: only describes data shape).
// Timeless fields + validators live here instead of inline in controllers.
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    password: { type: String, required: true },
    role: { type: String, enum: ['user'], default: 'user' },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    travelAgency: { type: String, trim: true },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    // Public JSON shape — never leak the password hash (DRY).
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema, 'users');
