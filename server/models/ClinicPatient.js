const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  patientId: { type: String, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 140 },
  phone: { type: String, required: true, trim: true, maxlength: 30, index: true },
  email: { type: String, trim: true, lowercase: true, default: '', maxlength: 180 },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['female', 'male', 'other', 'prefer_not_to_say'], default: 'prefer_not_to_say' },
  address: { type: String, trim: true, default: '', maxlength: 500 },
  allergies: { type: String, default: '', maxlength: 2000 },
  medicalNotes: { type: String, default: '', maxlength: 5000 },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('ClinicPatient', patientSchema);
