
const express = require('express');
const protect = require('../middleware/authMiddleware');
const publicCache = require('../middleware/publicCache');


const {
  createProduct,
  getMyProducts,
  deleteProduct,
  getProducts,
  getProductById,
} = require('../controllers/productController');

const router = express.Router();

router.post('/', protect, createProduct);
router.get('/', publicCache, getProducts);
router.get('/my-products', protect, getMyProducts);
router.get('/:id', publicCache, getProductById);
router.delete('/:id', protect, deleteProduct);




module.exports = router;
