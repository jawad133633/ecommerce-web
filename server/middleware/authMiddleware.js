
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Please login first',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('sessionVersion active').lean();
    if (!user || user.active === false || (user.sessionVersion || 0) !== (decoded.sessionVersion || 0)) {
      return res.status(401).json({ success: false, message: 'Your session is no longer valid. Please sign in again.' });
    }

    req.user = {
      id: decoded.userId,
      role: decoded.role,
      sessionVersion: decoded.sessionVersion || 0,
    };

    next();
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError', 'CastError'].includes(error.name)) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    console.error('Authentication check failed:', error.message);
    return res.status(503).json({ success: false, message: 'Unable to verify your session right now. Please try again.' });
  }
};

module.exports = protect;

