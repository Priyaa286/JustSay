const sendResponse = (res, statusCode, success, message, data = null) => {
  const responseBody = {
    success,
    message
  };

  if (data !== null) {
    responseBody.data = data;
  }

  return res.status(statusCode).json(responseBody);
};

const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return sendResponse(res, statusCode, true, message, data);
};

const sendError = (res, message, statusCode = 500, errors = null) => {
  const responseBody = {
    success: false,
    message
  };

  if (errors) {
    responseBody.errors = errors;
  }

  return res.status(statusCode).json(responseBody);
};

module.exports = {
  sendResponse,
  sendSuccess,
  sendError
};
