const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicPatient', required: true, index: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scheduledAt: { type: Date, required: true, index: true },
  reason: { type: String, default: '', trim: true, maxlength: 500 },
  status: { type: String, enum: ['scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'], default: 'scheduled', index: true },
  tokenNumber: { type: Number },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

appointmentSchema.index({ scheduledAt: 1, tokenNumber: 1 });
module.exports = mongoose.model('ClinicAppointment', appointmentSchema);
