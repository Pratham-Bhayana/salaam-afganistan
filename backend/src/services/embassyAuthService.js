const Embassy = require('../models/Embassy');
const EmbassyStaff = require('../models/EmbassyStaff');
const EmbassyRefreshToken = require('../models/EmbassyRefreshToken');
const { ApiError } = require('../middleware/error');
const {
  ACTOR_TYPES,
  buildEmbassySessionStaff,
  signEmbassyAccessToken,
  signEmbassyRefreshToken,
  resolveActorType,
} = require('../middleware/embassyAuth');
const { EMBASSY_ROLES, getEmbassyPermissionsForRole } = require('../config/embassyPermissions');
const { sha256, randomToken } = require('../utils/helpers');
const { writeAudit } = require('./auditService');
const { logEmbassyActivity } = require('./embassyActivityService');
const jwt = require('jsonwebtoken');

function refreshExpiryDate() {
  const days = Number(process.env.JWT_REFRESH_DAYS || 7);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function buildTokenSession(actorType, actor) {
  if (actorType === ACTOR_TYPES.EMBASSY) {
    return {
      sub: actor._id.toString(),
      actorType: ACTOR_TYPES.EMBASSY,
      role: EMBASSY_ROLES.EMBASSY_ADMIN,
      email: actor.email,
      embassyId: actor._id.toString(),
    };
  }

  return {
    sub: actor._id.toString(),
    actorType: ACTOR_TYPES.STAFF,
    role: actor.role,
    email: actor.email,
    embassyId: (actor.embassy._id || actor.embassy).toString(),
  };
}

async function issueEmbassySession(actorType, actor, meta = {}) {
  const tokenSession = buildTokenSession(actorType, actor);
  const jti = randomToken(16);
  const accessToken = signEmbassyAccessToken(tokenSession);
  const refreshToken = signEmbassyRefreshToken(tokenSession, jti);

  await EmbassyRefreshToken.create({
    embassyStaff: actor._id,
    tokenHash: sha256(refreshToken),
    expiresAt: refreshExpiryDate(),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  let staffPayload;
  if (actorType === ACTOR_TYPES.EMBASSY) {
    actor.lastLoginAt = new Date();
    await actor.save();
    staffPayload = buildEmbassySessionStaff(actor).toJSON();
  } else {
    actor.lastLoginAt = new Date();
    await actor.save();
    const populated = await EmbassyStaff.findById(actor._id).populate('embassy', 'name code');
    staffPayload = populated.toJSON();
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    staff: staffPayload,
    permissions: getEmbassyPermissionsForRole(tokenSession.role),
  };
}

async function login({ email, password, meta }) {
  const normalizedEmail = email.toLowerCase();

  const embassy = await Embassy.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (embassy && embassy.passwordHash) {
    if (!embassy.isActive) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const ok = await embassy.comparePassword(password);
    if (!ok) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const session = await issueEmbassySession(ACTOR_TYPES.EMBASSY, embassy, meta);

    await writeAudit({
      action: 'embassy.login',
      resourceType: 'Embassy',
      resourceId: embassy._id,
      actorType: 'embassy',
      actorId: embassy._id,
      actorEmail: embassy.email,
      actorRole: EMBASSY_ROLES.EMBASSY_ADMIN,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await logEmbassyActivity({
      embassy: embassy._id,
      embassyStaff: embassy._id,
      action: 'login',
      resourceType: 'Embassy',
      resourceId: embassy._id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return session;
  }

  const embassyStaff = await EmbassyStaff.findOne({
    email: normalizedEmail,
    role: EMBASSY_ROLES.EMBASSY_STAFF,
  })
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

  const session = await issueEmbassySession(ACTOR_TYPES.STAFF, embassyStaff, meta);

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

  stored.revokedAt = new Date();
  await stored.save();

  const actorType = resolveActorType(payload);
  if (actorType === ACTOR_TYPES.EMBASSY) {
    const embassy = await Embassy.findById(payload.sub);
    if (!embassy || !embassy.isActive) {
      throw new ApiError(401, 'Embassy account inactive');
    }
    return issueEmbassySession(ACTOR_TYPES.EMBASSY, embassy, meta);
  }

  const embassyStaff = await EmbassyStaff.findById(payload.sub);
  if (!embassyStaff || !embassyStaff.isActive) {
    throw new ApiError(401, 'Embassy staff account inactive');
  }

  return issueEmbassySession(ACTOR_TYPES.STAFF, embassyStaff, meta);
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
  const normalizedEmail = email.toLowerCase();

  const embassy = await Embassy.findOne({ email: normalizedEmail, isActive: true });
  if (embassy) {
    const token = randomToken(32);
    embassy.passwordResetTokenHash = sha256(token);
    embassy.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await embassy.save();

    return {
      ok: true,
      resetToken: process.env.NODE_ENV === 'production' ? undefined : token,
    };
  }

  const embassyStaff = await EmbassyStaff.findOne({
    email: normalizedEmail,
    isActive: true,
    role: EMBASSY_ROLES.EMBASSY_STAFF,
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

  const embassy = await Embassy.findOne({
    passwordResetTokenHash: hash,
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordHash');

  if (embassy) {
    embassy.passwordHash = await Embassy.hashPassword(newPassword);
    embassy.passwordResetTokenHash = undefined;
    embassy.passwordResetExpiresAt = undefined;
    await embassy.save();

    await EmbassyRefreshToken.updateMany(
      { embassyStaff: embassy._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    return { ok: true };
  }

  const embassyStaff = await EmbassyStaff.findOne({
    passwordResetTokenHash: hash,
    passwordResetExpiresAt: { $gt: new Date() },
    role: EMBASSY_ROLES.EMBASSY_STAFF,
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
