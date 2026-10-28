const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmacyMedicine' },
  name: { type: String, required: true, trim: true, maxlength: 140 },
  dosage: { type: String, default: '', trim: true, maxlength: 140 },
  instructions: { type: String, default: '', trim: true, maxlength: 500 },
  days: { type: Number, min: 1 },
}, { _id: false });

const visitSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicPatient', required: true, index: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicAppointment' },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  diagnosis: { type: String, required: true, trim: true, maxlength: 3000 },
  notes: { type: String, default: '', maxlength: 10000 },
  prescriptions: { type: [prescriptionSchema], default: [] },
  followUpAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('ClinicVisit', visitSchema);
