const { validationResult } = require('express-validator');
const { ApiError } = require('./error');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new ApiError(422, 'Validation failed', errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })))
    );
  }
  return next();
}

module.exports = { validate };
