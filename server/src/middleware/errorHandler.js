const env = require('../config/env');
const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 && res.statusCode < 600 ? res.statusCode : 500);
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.url}:`, err.message);

  return sendError(
    res,
    message,
    statusCode,
    env.NODE_ENV !== 'production' ? err.stack : undefined
  );
};

module.exports = errorHandler;
