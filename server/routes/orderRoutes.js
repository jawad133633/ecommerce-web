const express = require('express');
const protect = require('../middleware/authMiddleware');
const { createOrder, getBuyerOrders, getSellerOrders, updateSellerOrderItem } = require('../controllers/orderController');

const router = express.Router();
router.post('/', protect, createOrder);
router.get('/mine', protect, getBuyerOrders);
router.get('/seller', protect, getSellerOrders);
router.patch('/:orderId/items/:productId/status', protect, updateSellerOrderItem);
module.exports = router;
