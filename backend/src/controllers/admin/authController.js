const { body } = require('express-validator');
const authService = require('../../services/authService');
const { asyncHandler, success } = require('../../middleware/error');
const { getEffectivePermissions } = require('../../config/permissions');

const loginValidators = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isString().isLength({ min: 8 }).withMessage('Password required'),
];

const login = asyncHandler(async (req, res) => {
  const session = await authService.login({
    email: req.body.email,
    password: req.body.password,
    meta: { ip: req.ip, userAgent: req.get('user-agent') },
  });
  return success(res, session);
});

const refresh = asyncHandler(async (req, res) => {
  const session = await authService.refresh({
    refreshToken: req.body.refreshToken,
    meta: { ip: req.ip, userAgent: req.get('user-agent') },
  });
  return success(res, session);
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout({ refreshToken: req.body.refreshToken, staff: req.staff });
  return success(res, { loggedOut: true });
});

const me = asyncHandler(async (req, res) => {
  return success(res, {
    staff: req.staff.toJSON(),
    permissions: getEffectivePermissions(req.staff.role, req.staff.sectionOverrides),
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email);
  return success(res, result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword({
    token: req.body.token,
    newPassword: req.body.newPassword,
  });
  return success(res, result);
});

module.exports = {
  loginValidators,
  login,
  refresh,
  logout,
  me,
  forgotPassword,
  resetPassword,
};
