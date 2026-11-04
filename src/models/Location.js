const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true, index: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  speed: { type: Number, required: true, min: 0 },
  previousStop: { type: String, trim: true, default: '' },
  previousStopDwellTime: { type: Number, min: 0, default: 0 },
  destination: { type: String, trim: true, default: '' },
  distanceRemaining: { type: Number, min: 0 },
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('Location', locationSchema);
