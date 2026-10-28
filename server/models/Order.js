const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, default: '' },
  fulfillmentStatus: { type: String, enum: ['new', 'processing', 'shipped', 'delivered'], default: 'new' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: { type: [orderItemSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  customerName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  subtotal: { type: Number, min: 0 },
  discountAmount: { type: Number, min: 0, default: 0 },
  shippingAmount: { type: Number, min: 0, default: 0 },
  taxAmount: { type: Number, min: 0, default: 0 },
  paymentMethod: { type: String, trim: true, default: 'cash_on_delivery' },
  paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'], default: 'unpaid', index: true },
  paymentProvider: { type: String, trim: true, default: '' },
  paymentReference: { type: String, trim: true, default: '' },
  paymentUpdatedAt: { type: Date },
  paymentHistory: [{
    status: { type: String, enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'], required: true },
    amount: { type: Number, min: 0, default: 0 },
    provider: { type: String, trim: true, default: '' },
    reference: { type: String, trim: true, default: '' },
    source: { type: String, enum: ['system', 'webhook', 'admin'], default: 'system' },
    note: { type: String, maxlength: 300, default: '' },
    createdAt: { type: Date, default: Date.now },
  }],
  refundAmount: { type: Number, min: 0, default: 0 },
  refundStatus: { type: String, enum: ['none', 'pending', 'refunded', 'failed'], default: 'none' },
  refundReference: { type: String, trim: true, default: '' },
  refundedAt: { type: Date },
  status: { type: String, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], default: 'pending' },
  statusHistory: [{
    status: { type: String, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
}, { timestamps: true });

orderSchema.pre('save', function seedOrderHistory() {
  if (this.isNew && this.statusHistory.length === 0) this.statusHistory.push({ status: this.status || 'pending', changedAt: this.createdAt || new Date() });
});

orderSchema.index({ buyer: 1, createdAt: -1, _id: -1 });
orderSchema.index({ 'items.store': 1, createdAt: -1, _id: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1, _id: -1 });
orderSchema.index({ status: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('Order', orderSchema);
