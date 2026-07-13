const Staff = require('../models/Staff');
const RefreshToken = require('../models/RefreshToken');
const { ApiError } = require('../middleware/error');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../middleware/auth');
const { getPermissionsForRole } = require('../config/permissions');
const { sha256, randomToken } = require('../utils/helpers');
const { writeAudit } = require('./auditService');

function refreshExpiryDate() {
  const days = Number(process.env.JWT_REFRESH_DAYS || 7);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function issueSession(staff, meta = {}) {
  const jti = randomToken(16);
  const accessToken = signAccessToken(staff);
  const refreshToken = signRefreshToken(staff, jti);

  await RefreshToken.create({
    staff: staff._id,
    tokenHash: sha256(refreshToken),
    expiresAt: refreshExpiryDate(),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  staff.lastLoginAt = new Date();
  await staff.save();

  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    staff: staff.toJSON(),
    permissions: getPermissionsForRole(staff.role),
  };
}

async function login({ email, password, meta }) {
  const staff = await Staff.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!staff || !staff.isActive) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const ok = await staff.comparePassword(password);
  if (!ok) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const session = await issueSession(staff, meta);
  await writeAudit({
    action: 'staff.login',
    resourceType: 'Staff',
    resourceId: staff._id,
    actorType: 'staff',
    actorId: staff._id,
    actorEmail: staff.email,
    actorRole: staff.role,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return session;
}

async function refresh({ refreshToken, meta }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }
  if (payload.typ !== 'refresh') {
    throw new ApiError(401, 'Invalid refresh token type');
  }

  const hash = sha256(refreshToken);
  const stored = await RefreshToken.findOne({ tokenHash: hash, revokedAt: null });
  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, 'Refresh token revoked or expired');
  }

  const staff = await Staff.findById(payload.sub);
  if (!staff || !staff.isActive) {
    throw new ApiError(401, 'Staff account inactive');
  }

  stored.revokedAt = new Date();
  await stored.save();

  return issueSession(staff, meta);
}

async function logout({ refreshToken, staff }) {
  if (refreshToken) {
    await RefreshToken.updateOne(
      { tokenHash: sha256(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  } else if (staff) {
    await RefreshToken.updateMany(
      { staff: staff._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
}

async function requestPasswordReset(email) {
  const staff = await Staff.findOne({ email: email.toLowerCase(), isActive: true });
  if (!staff) {
    return { ok: true }; // do not leak existence
  }

  const token = randomToken(32);
  staff.passwordResetTokenHash = sha256(token);
  staff.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await staff.save();

  return {
    ok: true,
    // Exposed only in non-production for local testing
    resetToken: process.env.NODE_ENV === 'production' ? undefined : token,
  };
}

async function resetPassword({ token, newPassword }) {
  const hash = sha256(token);
  const staff = await Staff.findOne({
    passwordResetTokenHash: hash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordHash');

  if (!staff) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  staff.passwordHash = await Staff.hashPassword(newPassword);
  staff.passwordResetTokenHash = undefined;
  staff.passwordResetExpiresAt = undefined;
  await staff.save();

  await RefreshToken.updateMany(
    { staff: staff._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  return { ok: true };
}

module.exports = {
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
  issueSession,
};
