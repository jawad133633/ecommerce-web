const express = require('express');
const multer = require('multer');
const protect = require('../middleware/authMiddleware');
const { clinicAccess, allowRoles } = require('../middleware/clinicAccessMiddleware');
const clinic = require('../controllers/clinicController');
const { uploadProductImage } = require('../controllers/adminController');

const router = express.Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype)) return callback(new Error('Upload a JPG, PNG, WebP, or AVIF image.'));
    return callback(null, true);
  },
});
const guardedImageUpload = (req, res, next) => {
  req.uploadFolder = 'markethub/clinic/medicines';
  imageUpload.single('image')(req, res, (error) => {
    if (error) return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : error.message });
    return next();
  });
};

router.use(protect, clinicAccess);

router.get('/overview', allowRoles('admin'), clinic.getOverview);
router.get('/sales/export.csv', allowRoles('admin', 'pharmacist', 'receptionist'), clinic.exportSales);
router.get('/sales', allowRoles('admin', 'pharmacist', 'receptionist'), clinic.listSales);
router.get('/sales/:id', allowRoles('admin', 'pharmacist', 'receptionist'), clinic.getSale);
router.post('/sales', allowRoles('admin', 'pharmacist'), clinic.createSale);
router.patch('/sales/:id/refund', allowRoles('admin'), clinic.refundSale);

router.get('/pharmacy/medicines', allowRoles('admin', 'doctor', 'pharmacist'), clinic.listMedicines);
router.post('/pharmacy/medicines', allowRoles('admin', 'pharmacist'), clinic.createMedicine);
router.patch('/pharmacy/medicines/:id', allowRoles('admin', 'pharmacist'), clinic.updateMedicine);
router.post('/pharmacy/medicines/:id/stock-adjustments', allowRoles('admin', 'pharmacist'), clinic.adjustStock);
router.post('/pharmacy/images', allowRoles('admin', 'pharmacist'), guardedImageUpload, uploadProductImage);

router.get('/patients', allowRoles('admin', 'doctor', 'receptionist'), clinic.listPatients);
router.post('/patients', allowRoles('admin', 'receptionist'), clinic.createPatient);
router.get('/patients/:id', allowRoles('admin', 'doctor', 'receptionist'), clinic.getPatient);
router.patch('/patients/:id', allowRoles('admin', 'doctor', 'receptionist'), clinic.updatePatient);

router.get('/doctors', allowRoles('admin', 'doctor', 'receptionist'), clinic.listDoctors);
router.get('/appointments', allowRoles('admin', 'doctor', 'receptionist'), clinic.listAppointments);
router.post('/appointments', allowRoles('admin', 'receptionist'), clinic.createAppointment);
router.patch('/appointments/:id/status', allowRoles('admin', 'doctor', 'receptionist'), clinic.updateAppointment);

router.get('/visits', allowRoles('admin', 'doctor'), clinic.listVisits);
router.post('/visits', allowRoles('doctor'), clinic.createVisit);

router.get('/staff', allowRoles('admin'), clinic.listStaff);
router.post('/staff', allowRoles('admin'), clinic.createStaff);
router.patch('/staff/:id/active', allowRoles('admin'), clinic.updateStaffActive);
router.get('/activity', allowRoles('admin'), clinic.listActivity);
router.get('/settings', allowRoles('admin'), clinic.getSettings);

module.exports = router;
