const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const staffRoles = ['admin', 'doctor', 'receptionist', 'pharmacist'];

const resetAttempts = new Map();
const resetWindowMs = 15 * 60 * 1000;
const maxResetRequests = 5;
function limitResetRequests(req, res, next) {
  const now = Date.now();
  const address = req.ip || req.socket.remoteAddress || 'unknown';
  let record = resetAttempts.get(address);
  if (!record || record.expiresAt <= now) { record = { count: 0, expiresAt: now + resetWindowMs }; resetAttempts.set(address, record); }
  record.count += 1;
  if (record.count > maxResetRequests) {
    res.set('Retry-After', String(Math.ceil((record.expiresAt - now) / 1000)));
    return res.status(429).json({ success: false, message: 'Too many reset requests. Please try again later.' });
  }
  if (resetAttempts.size > 10000) for (const [key, value] of resetAttempts) if (value.expiresAt <= now) resetAttempts.delete(key);
  return next();
}

async function forgotPassword(req, res) {
  const { identifier } = req.body || {};
  if (typeof identifier !== 'string' || identifier.trim().length < 3 || identifier.length > 180) return res.status(400).json({ success: false, message: 'Enter the registered email address or phone number.' });
  const { WA_ACCESS_TOKEN, WA_PHONE_NUMBER_ID, WA_RESET_TEMPLATE_NAME, APP_BASE_URL } = process.env;
  const version = process.env.WHATSAPP_GRAPH_API_VERSION || 'v23.0';
  if (!WA_ACCESS_TOKEN || !WA_PHONE_NUMBER_ID || !WA_RESET_TEMPLATE_NAME || !APP_BASE_URL) return res.status(503).json({ success: false, message: 'WhatsApp recovery is not configured. Ask the system administrator to configure the WhatsApp Business API and reset template.' });
  if (!/^v\d+\.\d+$/.test(version)) return res.status(503).json({ success: false, message: 'WhatsApp API version configuration is invalid.' });
  const raw = identifier.trim();
  const normalizedEmail = raw.toLowerCase();
  const normalizedPhone = raw.replace(/[\s().-]/g, '');
  const phoneQuery = normalizedPhone.replace(/^\+/, '');
  try {
    const user = await User.findOne({ $and: [{ role: { $in: staffRoles } }, { $or: [{ email: normalizedEmail }, ...(phoneQuery ? [{ phone: { $in: [raw, normalizedPhone, `+${phoneQuery}`, phoneQuery] } }] : [])] }] }).select('+passwordResetSentAt');
    if (user?.phone && staffRoles.includes(user.role)) {
      if (user.passwordResetSentAt && Date.now() - user.passwordResetSentAt.getTime() < 60_000) {
        return res.json({ success: true, message: 'If this staff account is registered, a recovery message has been sent to its WhatsApp number.' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
      user.passwordResetExpiresAt = new Date(Date.now() + 20 * 60 * 1000);
      user.passwordResetSentAt = new Date();
      await user.save();
      const base = APP_BASE_URL.replace(/\/$/, '');
      const resetUrl = `${base}/clinic-admin/reset-password?token=${encodeURIComponent(token)}`;
      const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(WA_PHONE_NUMBER_ID)}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WA_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneQuery,
          type: 'template',
          template: { name: WA_RESET_TEMPLATE_NAME, language: { code: process.env.WA_RESET_TEMPLATE_LANGUAGE || 'en_US' }, components: [{ type: 'body', parameters: [{ type: 'text', text: resetUrl }] }] },
        }),
      });
      if (!response.ok) {
        user.passwordResetTokenHash = undefined; user.passwordResetExpiresAt = undefined; user.passwordResetSentAt = undefined;
        await user.save();
        console.error(`WhatsApp reset delivery failed with HTTP ${response.status}.`);
        return res.status(502).json({ success: false, message: 'WhatsApp could not deliver the recovery message. Please try later or contact an administrator.' });
      }
    }
    return res.json({ success: true, message: 'If this staff account is registered, a recovery message has been sent to its WhatsApp number.' });
  } catch (error) {
    console.error('Clinic password recovery failed:', error.message);
    return res.status(502).json({ success: false, message: 'Password recovery could not be completed. Please try later.' });
  }
}

async function resetPassword(req, res) {
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token) || typeof password !== 'string' || password.length < 12 || password.length > 128) return res.status(400).json({ success: false, message: 'Use a valid, unexpired recovery link and a password of at least 12 characters.' });
  try {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetTokenHash: hash, passwordResetExpiresAt: { $gt: new Date() }, role: { $in: staffRoles }, active: { $ne: false } }).select('+passwordResetTokenHash +passwordResetExpiresAt');
    if (!user) return res.status(400).json({ success: false, message: 'This recovery link is invalid or has expired. Request a new link.' });
    user.password = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.passwordResetSentAt = undefined;
    await user.save();
    return res.json({ success: true, message: 'Your password has been changed. You can now sign in.' });
  } catch (error) {
    console.error('Clinic password reset failed:', error.message);
    return res.status(500).json({ success: false, message: 'Password could not be changed. Please request a new recovery link.' });
  }
}

module.exports = { forgotPassword, resetPassword, limitResetRequests };
