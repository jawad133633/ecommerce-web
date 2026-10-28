const User = require('../models/User');

const clinicAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id).select('role active').lean();
    const permitted = ['admin', 'doctor', 'receptionist', 'pharmacist'];
    if (!user || user.active === false || !permitted.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'An active clinic staff account is required.' });
    }
    req.user.role = user.role;
    return next();
  } catch (error) {
    console.error('Clinic access check failed:', error.message);
    return res.status(503).json({ success: false, message: 'Unable to verify clinic staff access.' });
  }
};

const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ success: false, message: 'Your clinic role cannot perform this action.' });
  return next();
};

module.exports = { clinicAccess, allowRoles };
