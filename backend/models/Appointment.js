const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: String, required: true },
  date: { type: Date, required: true },
  reason: { type: String },
  goal: { type: String },
  symptoms: { type: String },
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Appointment', AppointmentSchema);