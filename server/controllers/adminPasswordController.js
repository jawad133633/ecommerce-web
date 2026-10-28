const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const attemptsByIp = new Map();
const windowMs = 15 * 60 * 1000;
const maxRequests = 8;
const maxOtpAttempts = 5;

function limitAdminRecovery(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  let bucket = attemptsByIp.get(ip);
  if (!bucket || bucket.expiresAt <= now) {
    bucket = { count: 0, expiresAt: now + windowMs };
    attemptsByIp.set(ip, bucket);
  }
  bucket.count += 1;
  if (bucket.count > maxRequests) {
    res.set('Retry-After', String(Math.ceil((bucket.expiresAt - now) / 1000)));
    return res.status(429).json({ success: false, message: 'Too many recovery attempts. Try again later.' });
  }
  if (attemptsByIp.size > 10000) {
    for (const [key, value] of attemptsByIp) if (value.expiresAt <= now) attemptsByIp.delete(key);
  }
  return next();
}

const digest = (value) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(value).digest('hex');
const genericMessage = 'If this administrator account is eligible, a recovery code has been sent to the configured WhatsApp number.';

async function changeAdminPassword(req, res) {
  const { currentPassword, password, confirmPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof password !== 'string' || password.length < 12 || password.length > 128 || password !== confirmPassword) {
    return res.status(400).json({ success: false, message: password !== confirmPassword ? 'Passwords do not match.' : 'Enter your current password and a new password between 12 and 128 characters.' });
  }
  try {
    const user = await User.findOne({ _id: req.user.id, role: 'admin', active: { $ne: false } }).select('+password');
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) return res.status(403).json({ success: false, message: 'Current password is incorrect.' });
    user.password = await bcrypt.hash(password, 12);
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();
    return res.json({ success: true, message: 'Password changed. Sign in again with your new password.' });
  } catch (error) {
    console.error('Admin password change failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not change the password. Please try again.' });
  }
}

async function requestAdminOtp(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Enter a valid administrator email address.' });
  const config = {
    ADMIN_RECOVERY_WHATSAPP_NUMBER: process.env.ADMIN_RECOVERY_WHATSAPP_NUMBER,
    WA_ACCESS_TOKEN: process.env.WA_ACCESS_TOKEN,
    WA_PHONE_NUMBER_ID: process.env.WA_PHONE_NUMBER_ID,
    WA_ADMIN_OTP_TEMPLATE_NAME: process.env.WA_ADMIN_OTP_TEMPLATE_NAME,
    JWT_SECRET: process.env.JWT_SECRET,
  };
  const missing = Object.entries(config).filter(([, value]) => !String(value || '').trim()).map(([name]) => name);
  if (missing.length) {
    return res.status(503).json({ success: false, message: `WhatsApp recovery is not configured. Add these variables to server/.env and restart the backend: ${missing.join(', ')}. For immediate recovery, a trusted server operator can run "npm run admin:reset-password" from the server folder; this requires an interactive terminal and MongoDB access.` });
  }
  const { ADMIN_RECOVERY_WHATSAPP_NUMBER, WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID, WA_ADMIN_OTP_TEMPLATE_NAME, JWT_SECRET } = config;
  const target = ADMIN_RECOVERY_WHATSAPP_NUMBER.replace(/\D/g, '');
  if (target.length < 8 || target.length > 15) return res.status(503).json({ success: false, message: 'ADMIN_RECOVERY_WHATSAPP_NUMBER must include the country code and contain 8–15 digits.' });
  const configuredLength = Number.parseInt(process.env.ADMIN_OTP_LENGTH, 10);
  const otpLength = Number.isInteger(configuredLength) ? Math.min(8, Math.max(6, configuredLength)) : 6;
  const configuredTtl = Number.parseInt(process.env.ADMIN_OTP_TTL_SECONDS, 10);
  const ttlSeconds = Number.isInteger(configuredTtl) ? Math.min(900, Math.max(60, configuredTtl)) : 300;
  const version = process.env.WHATSAPP_GRAPH_API_VERSION || 'v23.0';
  if (!/^v\d+\.\d+$/.test(version)) return res.status(503).json({ success: false, message: 'WhatsApp API version configuration is invalid.' });

  try {
    const otp = crypto.randomInt(0, 10 ** otpLength).toString().padStart(otpLength, '0');
    const sentAt = new Date();
    const user = await User.findOneAndUpdate(
      {
        email,
        role: 'admin',
        active: { $ne: false },
        $or: [
          { adminResetOtpSentAt: { $exists: false } },
          { adminResetOtpSentAt: { $lte: new Date(sentAt.getTime() - 60_000) } },
        ],
      },
      {
        $set: {
          adminResetOtpHash: digest(`${email}:${otp}`),
          adminResetOtpExpiresAt: new Date(sentAt.getTime() + ttlSeconds * 1000),
          adminResetOtpAttempts: 0,
          adminResetOtpSentAt: sentAt,
        },
        $unset: { adminResetTokenHash: 1, adminResetTokenExpiresAt: 1 },
      },
      { new: true, runValidators: true }
    ).select('+adminResetOtpHash +adminResetOtpExpiresAt +adminResetOtpAttempts +adminResetOtpSentAt');
    if (!user) return res.json({ success: true, message: genericMessage });

    const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(WA_PHONE_NUMBER_ID)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: target,
        type: 'template',
        template: {
          name: WA_ADMIN_OTP_TEMPLATE_NAME,
          language: { code: process.env.WA_ADMIN_OTP_TEMPLATE_LANGUAGE || 'en_US' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: otp }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
        ],
        },
      }),
    });
    if (!response.ok) {
      await User.updateOne(
        { _id: user._id, adminResetOtpHash: user.adminResetOtpHash },
        { $unset: { adminResetOtpHash: 1, adminResetOtpExpiresAt: 1, adminResetOtpSentAt: 1 }, $set: { adminResetOtpAttempts: 0 } }
      );
      console.error(`Admin WhatsApp OTP delivery failed with HTTP ${response.status}.`);
      return res.status(502).json({ success: false, message: 'WhatsApp could not deliver the recovery code. Check the approved template and WhatsApp Business configuration.' });
    }
    return res.json({ success: true, message: genericMessage });
  } catch (error) {
    console.error('Admin OTP request failed:', error.message);
    return res.status(502).json({ success: false, message: 'Could not request a recovery code. Please try again later.' });
  }
}

async function verifyAdminOtp(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6,8}$/.test(otp)) return res.status(400).json({ success: false, message: 'Enter the administrator email and the recovery code.' });
  try {
    const user = await User.findOne({ email, role: 'admin', active: { $ne: false }, adminResetOtpExpiresAt: { $gt: new Date() } })
      .select('+adminResetOtpHash +adminResetOtpExpiresAt +adminResetOtpAttempts');
    if (!user?.adminResetOtpHash) return res.status(400).json({ success: false, message: 'The recovery code is invalid or expired. Request a new code.' });
    const submittedHash = Buffer.from(digest(`${email}:${otp}`), 'hex');
    const savedHash = Buffer.from(user.adminResetOtpHash, 'hex');
    const matches = submittedHash.length === savedHash.length && crypto.timingSafeEqual(submittedHash, savedHash);
    if (!matches) {
      const match = { _id: user._id, adminResetOtpHash: user.adminResetOtpHash, adminResetOtpExpiresAt: { $gt: new Date() } };
      if ((user.adminResetOtpAttempts || 0) + 1 >= maxOtpAttempts) {
        await User.updateOne(match, { $unset: { adminResetOtpHash: 1, adminResetOtpExpiresAt: 1, adminResetOtpSentAt: 1 }, $set: { adminResetOtpAttempts: 0 } });
        return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Request a new code.' });
      }
      await User.updateOne(match, { $inc: { adminResetOtpAttempts: 1 } });
      return res.status(400).json({ success: false, message: 'That recovery code is incorrect.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const claimed = await User.updateOne(
      { _id: user._id, adminResetOtpHash: user.adminResetOtpHash, adminResetOtpExpiresAt: { $gt: new Date() } },
      {
        $set: { adminResetTokenHash: digest(`${email}:${resetToken}`), adminResetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000), adminResetOtpAttempts: 0 },
        $unset: { adminResetOtpHash: 1, adminResetOtpExpiresAt: 1, adminResetOtpSentAt: 1 },
      }
    );
    if (!claimed.modifiedCount) return res.status(400).json({ success: false, message: 'The recovery code has already been used or expired. Request a new code.' });
    return res.json({ success: true, resetToken, message: 'Recovery code verified. Choose a new password.' });
  } catch (error) {
    console.error('Admin OTP verification failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not verify the recovery code. Please try again.' });
  }
}

async function resetAdminPassword(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const resetToken = typeof req.body?.resetToken === 'string' ? req.body.resetToken : '';
  const password = req.body?.password;
  const confirmPassword = req.body?.confirmPassword;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[a-f0-9]{64}$/i.test(resetToken)) return res.status(400).json({ success: false, message: 'Verify your recovery code before changing the password.' });
  if (typeof password !== 'string' || password.length < 12 || password.length > 128 || password !== confirmPassword) {
    return res.status(400).json({ success: false, message: password !== confirmPassword ? 'Passwords do not match.' : 'Use a password between 12 and 128 characters.' });
  }
  try {
    const tokenHash = digest(`${email}:${resetToken}`);
    const authorization = await User.exists({ email, role: 'admin', active: { $ne: false }, adminResetTokenHash: tokenHash, adminResetTokenExpiresAt: { $gt: new Date() } });
    if (!authorization) return res.status(400).json({ success: false, message: 'Password reset authorization expired. Request and verify a new recovery code.' });
    const hash = await bcrypt.hash(password, 12);
    const updated = await User.updateOne(
      { email, role: 'admin', active: { $ne: false }, adminResetTokenHash: tokenHash, adminResetTokenExpiresAt: { $gt: new Date() } },
      { $set: { password: hash }, $inc: { sessionVersion: 1 }, $unset: { adminResetTokenHash: 1, adminResetTokenExpiresAt: 1 } },
      { runValidators: true }
    );
    if (!updated.modifiedCount) return res.status(400).json({ success: false, message: 'Password reset authorization expired. Request and verify a new recovery code.' });
    return res.json({ success: true, message: 'Password changed. Sign in with your new password.' });
  } catch (error) {
    console.error('Admin password reset failed:', error.message);
    return res.status(500).json({ success: false, message: 'Could not reset the password. Please try again.' });
  }
}

module.exports = { requestAdminOtp, verifyAdminOtp, resetAdminPassword, changeAdminPassword, limitAdminRecovery };
