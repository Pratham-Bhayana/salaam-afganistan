const { body } = require('express-validator');
const websiteAuthService = require('../../services/websiteAuthService');
const { asyncHandler, success } = require('../../middleware/error');

const firebaseLoginValidators = [
  body('idToken').notEmpty().withMessage('Firebase idToken is required'),
];

/**
 * POST /website/auth/firebase
 * Body: { idToken, profile?: { firstName, lastName, displayName } }
 *
 * Frontend flow:
 * 1) Firebase Auth: Google / Email+password / Phone OTP
 * 2) user.getIdToken()
 * 3) Call this endpoint
 * 4) Store returned accessToken + refreshToken for API calls
 */
const firebaseLogin = asyncHandler(async (req, res) => {
  const session = await websiteAuthService.loginWithFirebase({
    idToken: req.body.idToken,
    profile: req.body.profile,
    meta: { ip: req.ip, userAgent: req.get('user-agent') },
  });
  return success(res, session);
});

const refresh = asyncHandler(async (req, res) => {
  const session = await websiteAuthService.refresh({
    refreshToken: req.body.refreshToken,
    meta: { ip: req.ip, userAgent: req.get('user-agent') },
  });
  return success(res, session);
});

const logout = asyncHandler(async (req, res) => {
  await websiteAuthService.logout({
    refreshToken: req.body.refreshToken,
    applicant: req.applicant,
  });
  return success(res, { loggedOut: true });
});

const me = asyncHandler(async (req, res) => {
  return success(res, { applicant: req.applicant.toJSON() });
});

module.exports = {
  firebaseLoginValidators,
  firebaseLogin,
  refresh,
  logout,
  me,
};
