const User = require('../models/User');

const requireAdmin = async (req, res, next) => {
  try {
    // Use MongoDB as the source of truth so role changes and revocations take
    // effect immediately, even when the current JWT contains an older role.
    const user = await User.findById(req.user?.id).select('role active').lean();
    if (!user || user.role !== 'admin' || user.active === false) {
      return res.status(403).json({
        success: false,
        message: 'This account does not have active administrator access.',
      });
    }
    req.user.role = user.role;
    return next();
  } catch (error) {
    console.error('Admin role check failed:', error.message);
    return res.status(503).json({ success: false, message: 'Unable to verify administrator access. Check the database connection and try again.' });
  }
};

module.exports = requireAdmin;
