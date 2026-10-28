
const Store = require('../models/Store');
const Product = require('../models/Product');

const getStores = async (req, res) => {
  try {
    const stores = await Store.find().select('-owner').sort({ createdAt: -1, _id: -1 }).limit(100).lean();
    const productSummaries = stores.length ? await Product.aggregate([
      { $match: { store: { $in: stores.map((store) => store._id) } } },
      { $group: { _id: '$store', productCount: { $sum: 1 }, preview: { $first: '$imageUrl' } } },
    ]) : [];
    const summaryByStore = new Map(productSummaries.map((item) => [String(item._id), item]));
    return res.status(200).json({
      success: true,
      stores: stores.map((store) => {
        const summary = summaryByStore.get(String(store._id));
        return { ...store, productCount: summary?.productCount || 0, preview: summary?.preview || '' };
      }),
    });
  } catch (error) {
    console.error('Get marketplace shops error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to fetch shops right now.' });
  }
};

const getStoreBySlug = async (req, res) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug }).select('-owner');
    if (!store) return res.status(404).json({ success: false, message: 'Store not found' });
    const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(60, Number.parseInt(req.query.limit, 10) || 30));
    const [products, total] = await Promise.all([
      Product.find({ store: store._id }).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments({ store: store._id }),
    ]);
    return res.status(200).json({ success: true, store, products, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get public store error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to fetch store' });
  }
};

const createStore = async (req, res) => {
  try {
    const { name, description, logoUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Store name is required',
      });
    }

    const existingStore = await Store.findOne({
      owner: req.user.id,
    });

    if (existingStore) {
      return res.status(409).json({
        success: false,
        message: 'You already have a store',
      });
    }

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid store name',
      });
    }

    const duplicateSlug = await Store.findOne({ slug });

    if (duplicateSlug) {
      return res.status(409).json({
        success: false,
        message: 'This store URL is already taken. Try another name.',
      });
    }

    const store = await Store.create({
      name: name.trim(),
      slug,
      description: description || '',
      logoUrl: logoUrl || '',
      owner: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Store created successfully',
      store,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Store name URL is already taken',
      });
    }

    console.error('Create store error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to create store',
    });
  }
};

const getMyStore = async (req, res) => {
  try {
    const store = await Store.findOne({
      owner: req.user.id,
    });

    return res.status(200).json({
      success: true,
      store,
    });
  } catch (error) {
    console.error('Get store error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch your store',
    });
  }
};

module.exports = {
  getStores,
  getStoreBySlug,
  createStore,
  getMyStore,
};
