const { body } = require('express-validator');
const embassyAuthService = require('../../services/embassyAuthService');
const { asyncHandler, success } = require('../../middleware/error');
const { getEmbassyPermissionsForRole } = require('../../config/embassyPermissions');
const { getClientIp } = require('../../utils/helpers');

const loginValidators = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isString().isLength({ min: 8 }).withMessage('Password required'),
];

const login = asyncHandler(async (req, res) => {
  const session = await embassyAuthService.login({
    email: req.body.email,
    password: req.body.password,
    meta: { ip: getClientIp(req), userAgent: req.get('user-agent') },
  });
  return success(res, session);
});

const refresh = asyncHandler(async (req, res) => {
  const session = await embassyAuthService.refresh({
    refreshToken: req.body.refreshToken,
    meta: { ip: getClientIp(req), userAgent: req.get('user-agent') },
  });
  return success(res, session);
});

const logout = asyncHandler(async (req, res) => {
  await embassyAuthService.logout({
    refreshToken: req.body.refreshToken,
    embassyStaff: req.embassyStaff,
  });
  return success(res, { loggedOut: true });
});

const me = asyncHandler(async (req, res) => {
  return success(res, {
    staff: req.embassyStaff.toJSON(),
    embassy: req.embassyStaff.embassy,
    permissions: getEmbassyPermissionsForRole(req.embassyStaff.role),
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await embassyAuthService.requestPasswordReset(req.body.email);
  return success(res, result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await embassyAuthService.resetPassword({
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
