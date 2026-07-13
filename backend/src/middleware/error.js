class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function success(res, data, meta = null, statusCode = 200) {
  const payload = { success: true, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const body = {
    success: false,
    message: err.message || 'Internal server error',
  };

  if (err.details) body.details = err.details;

  if (err.name === 'ValidationError') {
    body.message = 'Validation failed';
    body.details = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json(body);
  }

  if (err.code === 11000) {
    body.message = 'Duplicate key — record already exists';
    body.details = err.keyValue;
    return res.status(409).json(body);
  }

  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    body.stack = err.stack;
  }

  return res.status(statusCode).json(body);
}

module.exports = {
  ApiError,
  asyncHandler,
  success,
  notFound,
  errorHandler,
};
