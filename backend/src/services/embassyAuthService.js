const EmbassyStaff = require('../models/EmbassyStaff');
const EmbassyRefreshToken = require('../models/EmbassyRefreshToken');
const { ApiError } = require('../middleware/error');
const {
  signEmbassyAccessToken,
  signEmbassyRefreshToken,
} = require('../middleware/embassyAuth');
const { getEmbassyPermissionsForRole } = require('../config/embassyPermissions');
const { sha256, randomToken } = require('../utils/helpers');
const { writeAudit } = require('./auditService');
const { logEmbassyActivity } = require('./embassyActivityService');
const jwt = require('jsonwebtoken');

function refreshExpiryDate() {
  const days = Number(process.env.JWT_REFRESH_DAYS || 7);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function issueEmbassySession(embassyStaff, meta = {}) {
  const jti = randomToken(16);
  const accessToken = signEmbassyAccessToken(embassyStaff);
  const refreshToken = signEmbassyRefreshToken(embassyStaff, jti);

  await EmbassyRefreshToken.create({
    embassyStaff: embassyStaff._id,
    tokenHash: sha256(refreshToken),
    expiresAt: refreshExpiryDate(),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  embassyStaff.lastLoginAt = new Date();
  await embassyStaff.save();

  const populated = await EmbassyStaff.findById(embassyStaff._id).populate('embassy', 'name code');

  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    staff: populated.toJSON(),
    permissions: getEmbassyPermissionsForRole(embassyStaff.role),
  };
}

async function login({ email, password, meta }) {
  const embassyStaff = await EmbassyStaff.findOne({ email: email.toLowerCase() })
    .select('+passwordHash')
    .populate('embassy', 'name code isActive');

  if (!embassyStaff || !embassyStaff.isActive) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (embassyStaff.embassy && embassyStaff.embassy.isActive === false) {
    throw new ApiError(403, 'Embassy is inactive');
  }

  const ok = await embassyStaff.comparePassword(password);
  if (!ok) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const session = await issueEmbassySession(embassyStaff, meta);

  await writeAudit({
    action: 'embassy_staff.login',
    resourceType: 'EmbassyStaff',
    resourceId: embassyStaff._id,
    actorType: 'embassy',
    actorId: embassyStaff._id,
    actorEmail: embassyStaff.email,
    actorRole: embassyStaff.role,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  await logEmbassyActivity({
    embassy: embassyStaff.embassy._id || embassyStaff.embassy,
    embassyStaff: embassyStaff._id,
    action: 'login',
    resourceType: 'EmbassyStaff',
    resourceId: embassyStaff._id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return session;
}

async function refresh({ refreshToken, meta }) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }
  if (payload.typ !== 'refresh' || payload.panel !== 'embassy') {
    throw new ApiError(401, 'Invalid embassy refresh token');
  }

  const hash = sha256(refreshToken);
  const stored = await EmbassyRefreshToken.findOne({ tokenHash: hash, revokedAt: null });
  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, 'Refresh token revoked or expired');
  }

  const embassyStaff = await EmbassyStaff.findById(payload.sub);
  if (!embassyStaff || !embassyStaff.isActive) {
    throw new ApiError(401, 'Embassy staff account inactive');
  }

  stored.revokedAt = new Date();
  await stored.save();

  return issueEmbassySession(embassyStaff, meta);
}

async function logout({ refreshToken, embassyStaff }) {
  if (refreshToken) {
    await EmbassyRefreshToken.updateOne(
      { tokenHash: sha256(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  } else if (embassyStaff) {
    await EmbassyRefreshToken.updateMany(
      { embassyStaff: embassyStaff._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
}

async function requestPasswordReset(email) {
  const embassyStaff = await EmbassyStaff.findOne({
    email: email.toLowerCase(),
    isActive: true,
  });
  if (!embassyStaff) return { ok: true };

  const token = randomToken(32);
  embassyStaff.passwordResetTokenHash = sha256(token);
  embassyStaff.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await embassyStaff.save();

  return {
    ok: true,
    resetToken: process.env.NODE_ENV === 'production' ? undefined : token,
  };
}

async function resetPassword({ token, newPassword }) {
  const hash = sha256(token);
  const embassyStaff = await EmbassyStaff.findOne({
    passwordResetTokenHash: hash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordHash');

  if (!embassyStaff) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  embassyStaff.passwordHash = await EmbassyStaff.hashPassword(newPassword);
  embassyStaff.passwordResetTokenHash = undefined;
  embassyStaff.passwordResetExpiresAt = undefined;
  await embassyStaff.save();

  await EmbassyRefreshToken.updateMany(
    { embassyStaff: embassyStaff._id, revokedAt: null },
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
  issueEmbassySession,
};
