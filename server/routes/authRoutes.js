const express = require('express');
const { signup, login, loginAdmin } = require('../controllers/authController');
const authRateLimit = require('../middleware/rateLimit');
const { forgotPassword, resetPassword, limitResetRequests } = require('../controllers/clinicPasswordController');
const { requestAdminOtp, verifyAdminOtp, resetAdminPassword, limitAdminRecovery } = require('../controllers/adminPasswordController');

const router = express.Router();

router.post('/signup', authRateLimit, signup);
router.post('/login', authRateLimit, login);
router.post('/admin/login', authRateLimit, loginAdmin);
router.post('/admin/forgot-password', limitAdminRecovery, requestAdminOtp);
router.post('/admin/verify-otp', limitAdminRecovery, verifyAdminOtp);
router.post('/admin/reset-password', limitAdminRecovery, resetAdminPassword);
router.post('/clinic/forgot-password', limitResetRequests, forgotPassword);
router.post('/clinic/reset-password', authRateLimit, resetPassword);

module.exports = router;
