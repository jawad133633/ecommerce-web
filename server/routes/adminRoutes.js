const express = require('express');
const multer = require('multer');
const protect = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/adminMiddleware');
const admin = require('../controllers/adminController');
const adminPassword = require('../controllers/adminPasswordController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype)) return callback(new Error('Upload a JPG, PNG, WebP, or AVIF image.'));
    callback(null, true);
  },
});
const router = express.Router();
router.use(protect, requireAdmin);
router.get('/overview', admin.getOverview);
router.get('/orders', admin.getOrders);
router.get('/reports/export.csv', admin.exportSalesCsv);
router.get('/reports', admin.getSalesReport);
router.get('/payments', admin.getPayments);
router.get('/customers', admin.getCustomers);
router.post('/security/change-password', adminPassword.changeAdminPassword);
router.patch('/orders/:id/status', admin.updateOrderStatus);
router.get('/products', admin.getProducts);
router.post('/products', admin.createProduct);
router.patch('/products/:id', admin.updateProduct);
router.delete('/products/:id', admin.deleteProduct);
router.post('/products/upload-image', (req, res, next) => upload.single('image')(req, res, (error) => {
  if (error) return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : error.message });
  next();
}), admin.uploadProductImage);
module.exports = router;
