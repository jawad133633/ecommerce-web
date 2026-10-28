const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const billSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true, index: true },
  idempotencyKey: { type: String, unique: true, sparse: true, select: false },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicPatient' },
  patientName: { type: String, trim: true, default: '' },
  visit: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicVisit' },
  items: { type: [billItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  refundedAmount: { type: Number, default: 0, min: 0 },
  refundReason: { type: String, default: '', maxlength: 500 },
  paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer', 'mobile_wallet', 'other'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partially_refunded', 'refunded'], default: 'paid', index: true },
  status: { type: String, enum: ['completed', 'partially_refunded', 'refunded', 'void'], default: 'completed', index: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

billSchema.index({ createdAt: -1, _id: -1 });
billSchema.index({ patient: 1, createdAt: -1 });
module.exports = mongoose.model('ClinicBill', billSchema);
