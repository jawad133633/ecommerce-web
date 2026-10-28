
const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 10,
  checkperiod: 20,
  useClones: false,
});

const publicCache = (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  // Cache only the public products listing, including its query parameters.
  if (req.baseUrl !== '/api/products' || req.path !== '/') {
    return next();
  }

  const cacheKey = `${req.baseUrl}${req.originalUrl}`;
  const cachedResponse = cache.get(cacheKey);

  if (cachedResponse) {
    res.set('X-Cache', 'HIT');
    return res.status(cachedResponse.status).json(cachedResponse.body);
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (res.statusCode === 200 && body?.success === true) {
      cache.set(cacheKey, {
        status: res.statusCode,
        body,
      });
    }

    res.set('X-Cache', 'MISS');
    return originalJson(body);
  };

  next();
};

module.exports = publicCache;
module.exports.cache = cache;
module.exports.clearCache = () => cache.flushAll();