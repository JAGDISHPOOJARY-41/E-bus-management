const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    busNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    busType: { type: String, enum: ['Ordinary', 'Express', 'AC', 'Non-AC', 'Electric'], required: true },
    source: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    sourceTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    destinationTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    contactNumber: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Active', 'Inactive', 'On Time', 'Delayed'], default: 'Active' },
    currentLatitude: { type: Number },
    currentLongitude: { type: Number },
    currentSpeed: { type: Number, min: 0 },
    lastLocationAt: { type: Date },
    trackingActive: { type: Boolean, default: false },
    trackingUpdatedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { toJSON: { virtuals: false, transform: (_doc, ret) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } } }
);

module.exports = mongoose.model('Bus', busSchema);
