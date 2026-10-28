const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true, trim: true, maxlength: 80 },
  expiresAt: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 0 },
  purchasePrice: { type: Number, min: 0, default: 0 },
}, { timestamps: true, optimisticConcurrency: true });

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140, index: true },
  genericName: { type: String, trim: true, default: '', maxlength: 140 },
  strength: { type: String, trim: true, default: '', maxlength: 60 },
  dosageForm: { type: String, trim: true, default: '', maxlength: 60 },
  category: { type: String, required: true, trim: true, maxlength: 100, index: true },
  description: { type: String, default: '', maxlength: 3000 },
  imageUrl: { type: String, default: '', trim: true },
  sellingPrice: { type: Number, required: true, min: 0 },
  purchasePrice: { type: Number, default: 0, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 10, min: 0 },
  batches: { type: [batchSchema], default: [] },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

medicineSchema.index({ 'batches.expiresAt': 1 });
medicineSchema.index({ active: 1, stock: 1 });
module.exports = mongoose.model('PharmacyMedicine', medicineSchema);
