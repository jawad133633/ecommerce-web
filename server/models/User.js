const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'seller', 'admin', 'doctor', 'receptionist', 'pharmacist'],
      default: 'customer',
      index: true,
    },
    phone: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true, index: true },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordResetSentAt: { type: Date, select: false },
    adminResetOtpHash: { type: String, select: false },
    adminResetOtpExpiresAt: { type: Date, select: false },
    adminResetOtpAttempts: { type: Number, default: 0, select: false },
    adminResetOtpSentAt: { type: Date, select: false },
    adminResetTokenHash: { type: String, select: false },
    adminResetTokenExpiresAt: { type: Date, select: false },
    sessionVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
