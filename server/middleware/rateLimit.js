const windows = new Map();

const WINDOW_MS = 15 * 60 * 1000;

const MAX_REQUESTS =
  process.env.LOAD_TEST_MODE === 'true' ? 1000 : 150;

let requestsSinceCleanup = 0;

const authRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';

  let window = windows.get(key);

  if (!window || window.expiresAt <= now) {
    window = {
      count: 0,
      expiresAt: now + WINDOW_MS,
    };

    windows.set(key, window);
  }

  window.count += 1;

  if (window.count > MAX_REQUESTS) {
    res.set(
      'Retry-After',
      String(Math.ceil((window.expiresAt - now) / 1000))
    );

    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Try again later.',
    });
  }

  requestsSinceCleanup += 1;

  if (requestsSinceCleanup >= 1000) {
    requestsSinceCleanup = 0;

    for (const [address, entry] of windows) {
      if (entry.expiresAt <= now) {
        windows.delete(address);
      }
    }
  }

  return next();
};

module.exports = authRateLimit;