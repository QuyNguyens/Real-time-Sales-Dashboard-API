const rateLimit = require('express-rate-limit');

/**
 * Rate limiter dùng chung
 * @param {number} max - số request tối đa
 * @param {number} windowSeconds - thời gian giới hạn (giây)
 */
function createLimiter(max, windowSeconds) {
  return rateLimit({
    windowMs: windowSeconds * 1000,
    max,
    message: {
      status: 'error',
      message: `Too many requests. Please try again later.`
    }
  });
}

module.exports = {
  createLimiter,
};
