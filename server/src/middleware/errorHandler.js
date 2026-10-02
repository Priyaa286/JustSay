const env = require('../config/env');
const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || res.statusCode !== 200 ? res.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.url}:`, err);

  const errorResponse = {
    message
  };

  if (env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.stack = err.stack;
  }

  return sendError(
    res,
    message,
    statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    env.NODE_ENV !== 'production' ? err.stack : undefined
  );
};

module.exports = errorHandler;
