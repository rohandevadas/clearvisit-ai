const mongoose = require('mongoose');

const MedicalProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: String,
  dob: Date,
  bloodType: String,
  
  // Legacy combined fields (maintained for backward compatibility)
  heightWeight: String,
  emergencyContact: String,
  
  // New separate fields
  height: String,
  weight: String,
  emergencyContactName: String,
  emergencyContactPhone: String,
  
  // Medical information
  conditions: String,
  medications: String,
  allergies: String,
  surgeries: String,
  doctors: String,
  insurance: String,
  vaccines: String,
  
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MedicalProfile', MedicalProfileSchema);