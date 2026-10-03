const env = require('../config/env');
const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 && res.statusCode < 600 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';
  
  // Safe generic messages for 500 errors to avoid exposing internal logic
  if (statusCode === 500 && !err.isPublic) {
    message = 'Something went wrong on our end. Please try again.';
  }

  const errorCode = err.errorCode || err.code || 'UNKNOWN_ERROR';

  console.error(`[Error] ${req.method} ${req.url}: [${errorCode}]`, err.message);

  return sendError(
    res,
    message,
    statusCode,
    errorCode
  );
};

module.exports = errorHandler;
