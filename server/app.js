const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const storeRoutes = require('./routes/storeRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const mongoose = require('mongoose');

const app = express();

// Set TRUST_PROXY to the number of trusted reverse proxies in production so
// req.ip identifies clients correctly behind a load balancer/CDN.
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);
app.use(cors());
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ success: ready, database: ready ? 'connected' : 'unavailable' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});
  

// Netlify rewrites /api/* through this function path. Strip its prefix so the
// same Express app works both in Netlify Functions and on the local server.
app.use((req, res, next) => {
  const functionPrefix = '/.netlify/functions/api';
  if (req.url.startsWith(`${functionPrefix}/`)) {
    req.url = req.url.slice(functionPrefix.length);
  }
  next();
});

app.use('/api/auth', authRoutes);

app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/clinic', clinicRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'MarketHub backend is running!' });
});

module.exports = app;
