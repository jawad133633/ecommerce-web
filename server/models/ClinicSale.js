const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmacyMedicine', required: true },
  name: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
  batchAllocations: [{ batchId: mongoose.Schema.Types.ObjectId, quantity: Number }],
}, { _id: false });

const saleSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true, index: true },
  idempotencyKey: { type: String, unique: true, sparse: true, select: false },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicPatient' },
  patientName: { type: String, trim: true, default: '' },
  items: { type: [saleItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer', 'mobile_wallet', 'other'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partially_refunded', 'refunded'], default: 'paid', index: true },
  status: { type: String, enum: ['completed', 'partially_refunded', 'refunded', 'void'], default: 'completed', index: true },
  refundedAmount: { type: Number, default: 0, min: 0 },
  refundReason: { type: String, default: '', maxlength: 500 },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

saleSchema.index({ createdAt: -1, _id: -1 });
saleSchema.index({ patient: 1, createdAt: -1 });
saleSchema.index({ staff: 1, createdAt: -1 });
module.exports = mongoose.model('ClinicSale', saleSchema);
