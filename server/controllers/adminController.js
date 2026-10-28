const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Store = require('../models/Store');
const { clearCache } = require('../middleware/publicCache');

const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const paymentStatuses = ['unpaid', 'pending', 'paid', 'failed', 'refunded'];
const productFields = ['name', 'description', 'price', 'imageUrl', 'imagePublicId', 'category', 'stock', 'isAvailable'];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function buildOrderFilter(query) {
  const filter = {};
  const createdAt = {};
  if (query.from) {
    const from = new Date(query.from);
    if (Number.isNaN(from.getTime())) throw new Error('Enter a valid start date.');
    from.setUTCHours(0, 0, 0, 0);
    createdAt.$gte = from;
  }
  if (query.to) {
    const to = new Date(query.to);
    if (Number.isNaN(to.getTime())) throw new Error('Enter a valid end date.');
    to.setUTCHours(0, 0, 0, 0);
    to.setUTCDate(to.getUTCDate() + 1);
    createdAt.$lt = to;
  }
  if (createdAt.$gte && createdAt.$lt && createdAt.$gte >= createdAt.$lt) throw new Error('The start date must be on or before the end date.');
  if (Object.keys(createdAt).length) filter.createdAt = createdAt;
  if (orderStatuses.includes(query.status)) filter.status = query.status;
  if (paymentStatuses.includes(query.paymentStatus)) filter.paymentStatus = query.paymentStatus;
  if (typeof query.paymentMethod === 'string' && query.paymentMethod.trim()) filter.paymentMethod = query.paymentMethod.trim();
  if (query.product && mongoose.isValidObjectId(query.product)) filter['items.product'] = new mongoose.Types.ObjectId(query.product);
  if (typeof query.search === 'string' && query.search.trim()) {
    const regex = new RegExp(escapeRegex(query.search.trim().slice(0, 100)), 'i');
    const ors = [{ customerName: regex }, { phone: regex }];
    const matchingUsers = await User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').lean();
    if (matchingUsers.length) ors.push({ buyer: { $in: matchingUsers.map((user) => user._id) } });
    if (mongoose.isValidObjectId(query.search.trim())) ors.push({ _id: new mongoose.Types.ObjectId(query.search.trim()) });
    filter.$or = ors;
  }
  return filter;
}

const capturedExpression = { $cond: [{ $in: ['$paymentStatus', ['paid', 'refunded']] }, '$total', 0] };
const refundExpression = { $cond: [{ $gt: [{ $ifNull: ['$refundAmount', 0] }, 0] }, '$refundAmount', { $cond: [{ $eq: ['$paymentStatus', 'refunded'] }, '$total', 0] }] };
const recognizedRefundExpression = { $cond: [{ $ne: ['$status', 'cancelled'] }, refundExpression, 0] };
const grossSalesExpression = { $cond: [{ $and: [{ $in: ['$paymentStatus', ['paid', 'refunded']] }, { $ne: ['$status', 'cancelled'] }] }, { $ifNull: ['$subtotal', '$total'] }, 0] };
const discountExpression = { $cond: [{ $and: [{ $in: ['$paymentStatus', ['paid', 'refunded']] }, { $ne: ['$status', 'cancelled'] }] }, { $ifNull: ['$discountAmount', 0] }, 0] };

async function listSalesOrders(filter, page, limit) {
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('buyer', 'name email').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  return { orders, total, page, pages: Math.ceil(total / limit) };
}

const getSalesReport = async (req, res) => {
  try {
    const filter = await buildOrderFilter(req.query);
    const granularity = ['day', 'month', 'year'].includes(req.query.granularity) ? req.query.granularity : 'day';
    const trendFormat = { day: '%Y-%m-%d', month: '%Y-%m', year: '%Y' }[granularity];
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const match = { $match: filter };
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = new Date(todayStart); weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const periodFilter = { ...filter }; delete periodFilter.createdAt;
    const periodStats = (start) => [
      { $match: { ...periodFilter, createdAt: { $gte: start } } },
      { $group: { _id: null, orders: { $sum: 1 }, grossSales: { $sum: grossSalesExpression }, discounts: { $sum: discountExpression }, refunds: { $sum: refundExpression }, recognizedRefunds: { $sum: recognizedRefundExpression } } },
      { $project: { _id: 0, orders: 1, grossSales: 1, discounts: 1, refunds: 1, netSales: { $subtract: [{ $subtract: ['$grossSales', '$discounts'] }, '$recognizedRefunds'] } } },
    ];
    const [summaryResult, records, periodResult, products] = await Promise.all([
      Order.aggregate([
        match,
        { $facet: {
          summary: [{ $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            grossSales: { $sum: grossSalesExpression },
            refunds: { $sum: refundExpression },
            recognizedRefunds: { $sum: recognizedRefundExpression },
            discounts: { $sum: discountExpression },
            netOrderValue: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0] } },
            pendingCollection: { $sum: { $cond: [{ $and: [{ $ne: ['$status', 'cancelled'] }, { $in: ['$paymentStatus', ['unpaid', 'pending']] }] }, '$total', 0] } },
            paidOrders: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
            orderValueCount: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, 1, 0] } },
          } }],
          trend: [
            { $group: {
              _id: { $dateToString: { format: trendFormat, date: '$createdAt', timezone: 'UTC' } },
              grossSales: { $sum: grossSalesExpression },
              discounts: { $sum: discountExpression },
              refunds: { $sum: refundExpression },
              recognizedRefunds: { $sum: recognizedRefundExpression },
              orders: { $sum: 1 },
            } },
            { $project: { grossSales: 1, discounts: 1, refunds: 1, orders: 1, netSales: { $subtract: [{ $subtract: ['$grossSales', '$discounts'] }, '$recognizedRefunds'] } } },
            { $sort: { _id: 1 } },
            { $limit: granularity === 'day' ? 366 : granularity === 'month' ? 120 : 30 },
          ],
          bestSellers: [
            { $match: { status: { $ne: 'cancelled' } } },
            { $unwind: '$items' },
            { $group: { _id: '$items.product', name: { $first: '$items.name' }, units: { $sum: '$items.quantity' }, orderValue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } } } },
            { $sort: { units: -1, orderValue: -1 } },
            { $limit: 10 },
          ],
          paymentMethods: [
            { $group: { _id: { $ifNull: ['$paymentMethod', 'unrecorded'] }, orders: { $sum: 1 }, grossSales: { $sum: grossSalesExpression }, discounts: { $sum: discountExpression }, refunds: { $sum: refundExpression }, recognizedRefunds: { $sum: recognizedRefundExpression }, collected: { $sum: capturedExpression } } },
            { $project: { orders: 1, grossSales: 1, discounts: 1, refunds: 1, collected: 1, netSales: { $subtract: [{ $subtract: ['$grossSales', '$discounts'] }, '$recognizedRefunds'] } } },
            { $sort: { orders: -1 } },
          ],
        } },
      ]),
      listSalesOrders(filter, page, limit),
      Order.aggregate([{ $facet: { today: periodStats(todayStart), last7Days: periodStats(weekStart), monthToDate: periodStats(monthStart), yearToDate: periodStats(yearStart) } }]),
      Product.find().select('name').sort({ name: 1 }).lean(),
    ]);
    const raw = summaryResult[0]?.summary?.[0] || {};
    const grossSales = raw.grossSales || 0;
    const refunds = raw.refunds || 0;
    const orderValueCount = raw.orderValueCount || 0;
    return res.json({
      success: true,
      summary: {
        totalOrders: raw.totalOrders || 0,
        completedOrders: raw.completedOrders || 0,
        cancelledOrders: raw.cancelledOrders || 0,
        grossSales,
        discounts: raw.discounts || 0,
        refunds,
        netSales: grossSales - (raw.discounts || 0) - (raw.recognizedRefunds || 0),
        netOrderValue: raw.netOrderValue || 0,
        pendingCollection: raw.pendingCollection || 0,
        paidOrders: raw.paidOrders || 0,
        averageOrderValue: orderValueCount ? (raw.netOrderValue || 0) / orderValueCount : 0,
      },
      trend: summaryResult[0]?.trend || [],
      bestSellers: summaryResult[0]?.bestSellers || [],
      paymentMethods: summaryResult[0]?.paymentMethods || [],
      periods: Object.fromEntries(Object.entries(periodResult[0] || {}).map(([key, rows]) => [key, rows[0] || { orders: 0, grossSales: 0, discounts: 0, refunds: 0, netSales: 0 }])),
      products,
      granularity,
      ...records,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message.startsWith('Enter a valid') || error.message.startsWith('The start date')) return res.status(400).json({ success: false, message: error.message });
    console.error('Admin sales report error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load sales reports.' });
  }
};

const csvCell = (value) => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

const exportSalesCsv = async (req, res) => {
  try {
    const filter = await buildOrderFilter(req.query);
    const headers = ['Order ID', 'Date', 'Delivery date', 'Customer', 'Email', 'Phone', 'Items', 'Order status', 'Payment method', 'Payment status', 'Subtotal', 'Discount', 'Shipping', 'Tax', 'Total', 'Refund amount', 'Refund status', 'Refund date', 'Net collected'];
    const rowForOrder = (order) => {
      const subtotal = order.subtotal ?? order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const refund = order.refundAmount || (order.paymentStatus === 'refunded' ? order.total : 0);
      const paid = ['paid', 'refunded'].includes(order.paymentStatus) ? order.total : 0;
      const deliveredAt = order.statusHistory?.filter((entry) => entry.status === 'delivered').at(-1)?.changedAt;
      const items = order.items.map((item) => `${item.name} x${item.quantity} @ ${item.unitPrice} each`).join('; ');
      return [order._id, order.createdAt?.toISOString(), deliveredAt?.toISOString(), order.customerName, order.buyer?.email, order.phone, items, order.status, order.paymentMethod, order.paymentStatus, subtotal, order.discountAmount || 0, order.shippingAmount || 0, order.taxAmount || 0, order.total, refund, order.refundStatus || 'none', order.refundedAt?.toISOString(), paid - refund].map(csvCell).join(',');
    };
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="markethub-sales-report.csv"');
    res.write(`${headers.map(csvCell).join(',')}\r\n`);
    const cursor = Order.find(filter).populate('buyer', 'name email').sort({ createdAt: -1, _id: -1 }).lean().cursor();
    for await (const order of cursor) {
      if (!res.write(`${rowForOrder(order)}\r\n`)) await new Promise((resolve) => res.once('drain', resolve));
    }
    return res.end();
  } catch (error) {
    if (error.message.startsWith('Enter a valid') || error.message.startsWith('The start date')) return res.status(400).json({ success: false, message: error.message });
    if (res.headersSent) return res.destroy(error);
    console.error('Admin sales export error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to export sales records.' });
  }
};

const getPayments = async (req, res) => {
  try {
    const filter = await buildOrderFilter(req.query);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const result = await listSalesOrders(filter, page, limit);
    const counts = await Order.aggregate([{ $match: filter }, { $group: { _id: '$paymentStatus', count: { $sum: 1 }, amount: { $sum: '$total' } } }]);
    return res.json({ success: true, ...result, counts, gatewayConfigured: false, updatedAt: new Date().toISOString() });
  } catch (error) {
    if (error.message.startsWith('Enter a valid') || error.message.startsWith('The start date')) return res.status(400).json({ success: false, message: error.message });
    console.error('Admin payments error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load payment records.' });
  }
};

const getOverview = async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const [sales, orderTotals, orderCount, customerCount, productCount, recentOrders, dailySales, lowStock] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: { $in: ['paid', 'refunded'] } } },
        { $group: { _id: null, revenue: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, { $subtract: [capturedExpression, refundExpression] }, 0] } } } },
      ]),
      Order.aggregate([
        { $match: { status: { $nin: ['cancelled', 'refunded'] } } },
        { $group: {
          _id: null,
          orderValue: { $sum: '$total' },
          pendingCollection: { $sum: { $cond: [{ $in: ['$paymentStatus', ['unpaid', 'pending']] }, '$total', 0] } },
        } },
      ]),
      Order.countDocuments(),
      User.countDocuments({ $or: [{ role: 'customer' }, { role: { $exists: false } }] }),
      Product.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(6).populate('buyer', 'name email').lean(),
      Order.aggregate([
        { $match: { createdAt: { $gte: start }, paymentStatus: { $in: ['paid', 'refunded'] } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, { $subtract: [capturedExpression, refundExpression] }, 0] } }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Product.countDocuments({ stock: { $lte: 5 } }),
    ]);
    const salesByDay = new Map(dailySales.map((row) => [row._id, row]));
    const chart = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, revenue: salesByDay.get(key)?.revenue || 0, orders: salesByDay.get(key)?.orders || 0 };
    });
    return res.json({ success: true, metrics: { revenue: sales[0]?.revenue || 0, orderValue: orderTotals[0]?.orderValue || 0, pendingCollection: orderTotals[0]?.pendingCollection || 0, orders: orderCount, customers: customerCount, products: productCount, lowStock }, recentOrders, sales: chart, updatedAt: now.toISOString() });
  } catch (error) {
    console.error('Admin overview error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load dashboard data.' });
  }
};

const getOrders = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = await buildOrderFilter(req.query);
    const [orders, total] = await Promise.all([
      Order.find(filter).populate('buyer', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);
    return res.json({ success: true, orders, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    if (error.message.startsWith('Enter a valid') || error.message.startsWith('The start date')) return res.status(400).json({ success: false, message: error.message });
    console.error('Admin orders error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load orders.' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status } = req.body || {};
  if (!orderStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Choose a valid order status.' });
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.status === status) return res.status(409).json({ success: false, message: 'Order already has this status.' });
    const updates = { $set: { status }, $push: { statusHistory: { status, changedAt: new Date(), changedBy: req.user.id } } };
    if (status !== 'pending' && status !== 'cancelled' && status !== 'refunded') {
      const fulfillmentStatus = status === 'confirmed' ? 'new' : status;
      updates.$set['items.$[].fulfillmentStatus'] = fulfillmentStatus;
    }
    const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, updates, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ success: false, message: 'This order changed while you were updating it. Reload and try again.' });
    return res.json({ success: true, order: updated });
  } catch (error) {
    console.error('Admin update order error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update order status.' });
  }
};

const getProducts = async (req, res) => {
  try {
    const [products, stores] = await Promise.all([
      Product.find().populate('store', 'name slug').populate('owner', 'name email').sort({ createdAt: -1 }).lean(),
      Store.find().select('name slug owner').populate('owner', 'name email').sort({ name: 1 }).lean(),
    ]);
    return res.json({ success: true, products, stores });
  } catch (error) {
    console.error('Admin products error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load products.' });
  }
};

const getCustomers = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const filter = { $or: [{ role: 'customer' }, { role: { $exists: false } }] };
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const regex = new RegExp(escapeRegex(req.query.search.trim().slice(0, 100)), 'i');
      filter.$and = [{ $or: [{ name: regex }, { email: regex }, { phone: regex }] }];
    }
    const [customers, total] = await Promise.all([
      User.find(filter).select('name email phone createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    return res.json({ success: true, customers, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Admin customers error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load customers.' });
  }
};

const validateProduct = (body, partial = false) => {
  if (!partial && (!String(body.name || '').trim() || !String(body.category || '').trim() || body.price === undefined)) return 'Name, category, and price are required.';
  if (body.name !== undefined && (!String(body.name).trim() || String(body.name).length > 120)) return 'Name must be between 1 and 120 characters.';
  if (body.description !== undefined && String(body.description).length > 2000) return 'Description must be 2,000 characters or fewer.';
  if (body.category !== undefined && (!String(body.category).trim() || String(body.category).length > 80)) return 'Enter a category up to 80 characters.';
  if (body.price !== undefined && (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)) return 'Price must be a non-negative number.';
  if (body.stock !== undefined && (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0)) return 'Stock must be a non-negative whole number.';
  if (body.imageUrl !== undefined && body.imageUrl && !/^https:\/\//i.test(body.imageUrl)) return 'Product image must use a secure HTTPS URL.';
  if (body.imagePublicId !== undefined && String(body.imagePublicId).length > 255) return 'Image identifier is too long.';
  return null;
};

const createProduct = async (req, res) => {
  const invalid = validateProduct(req.body || {});
  if (invalid) return res.status(400).json({ success: false, message: invalid });
  if (!mongoose.isValidObjectId(req.body.store)) return res.status(400).json({ success: false, message: 'Choose a valid store.' });
  try {
    const store = await Store.findById(req.body.store);
    if (!store) return res.status(404).json({ success: false, message: 'Store not found.' });
    const product = await Product.create({
      name: String(req.body.name).trim(), description: req.body.description || '', price: Number(req.body.price),
      imageUrl: req.body.imageUrl || '', imagePublicId: req.body.imagePublicId || '', category: String(req.body.category).trim(), stock: Number(req.body.stock || 0),
      isAvailable: req.body.isAvailable !== false && req.body.isAvailable !== 'false', store: store._id, owner: store.owner,
    });
    clearCache();
    return res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Admin create product error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to create product.' });
  }
};

const updateProduct = async (req, res) => {
  const invalid = validateProduct(req.body || {}, true);
  if (invalid) return res.status(400).json({ success: false, message: invalid });
  try {
    const updates = {};
    for (const field of productFields) if (req.body[field] !== undefined) updates[field] = req.body[field];
    if (updates.name !== undefined) updates.name = String(updates.name).trim();
    if (updates.category !== undefined) updates.category = String(updates.category).trim();
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);
    if (updates.isAvailable !== undefined) updates.isAvailable = updates.isAvailable === true || updates.isAvailable === 'true';
    const current = await Product.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Product not found.' });
    const oldImagePublicId = current.imagePublicId;
    Object.assign(current, updates);
    const product = await current.save();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (oldImagePublicId && oldImagePublicId !== product.imagePublicId && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
      cloudinary.uploader.destroy(oldImagePublicId).catch((error) => console.error('Old Cloudinary product image cleanup failed:', error.message));
    }
    clearCache();
    return res.json({ success: true, product });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    console.error('Admin update product error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update product.' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.imagePublicId && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
      cloudinary.uploader.destroy(product.imagePublicId).catch((error) => console.error('Cloudinary product image cleanup failed:', error.message));
    }
    clearCache();
    return res.json({ success: true, message: 'Product deleted.' });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid product ID.' });
    return res.status(500).json({ success: false, message: 'Unable to delete product.' });
  }
};

const uploadProductImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Choose a product image to upload.' });
  const bytes = req.file.buffer;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  const isAvif = bytes.toString('ascii', 4, 8) === 'ftyp' && /^(avif|avis)$/.test(bytes.toString('ascii', 8, 12));
  if (!(isJpeg || isPng || isWebp || isAvif)) return res.status(400).json({ success: false, message: 'The uploaded file is not a supported JPG, PNG, WebP, or AVIF image.' });
  const cloudinary = require('cloudinary').v2;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return res.status(503).json({ success: false, message: 'Image uploads are not configured on the server.' });
  cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });
  try {
      const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: req.uploadFolder || 'markethub/products', resource_type: 'image', transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto:good', fetch_format: 'auto' }] }, (error, response) => error ? reject(error) : resolve(response));
      stream.end(req.file.buffer);
    });
    return res.status(201).json({ success: true, imageUrl: result.secure_url, publicId: result.public_id });
  } catch (error) {
    console.error('Cloudinary image upload error:', error.message);
    return res.status(502).json({ success: false, message: 'Image upload failed. Please try another image.' });
  }
};

module.exports = { getOverview, getOrders, updateOrderStatus, getSalesReport, exportSalesCsv, getPayments, getCustomers, getProducts, createProduct, updateProduct, deleteProduct, uploadProductImage };
