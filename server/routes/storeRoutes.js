
const express = require('express');

const protect = require('../middleware/authMiddleware');
const publicCache = require('../middleware/publicCache');

const {
  createStore,
  getStores,
  getMyStore,
  getStoreBySlug,
} = require('../controllers/storeController');

const router = express.Router();

router.post('/', protect, createStore);
router.get('/', publicCache, getStores);
router.get('/my-store', protect, getMyStore);
router.get('/:slug', publicCache, getStoreBySlug);

module.exports = router;
