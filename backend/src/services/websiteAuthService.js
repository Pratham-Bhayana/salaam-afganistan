const jwt = require('jsonwebtoken');
const Applicant = require('../models/Applicant');
const ApplicantRefreshToken = require('../models/ApplicantRefreshToken');
const { verifyFirebaseIdToken } = require('../config/firebase');
const {
  signApplicantAccessToken,
  signApplicantRefreshToken,
} = require('../middleware/websiteAuth');
const { ApiError } = require('../middleware/error');
const { sha256, randomToken } = require('../utils/helpers');
const { writeAudit } = require('./auditService');

function refreshExpiryDate() {
  const days = Number(process.env.JWT_REFRESH_DAYS || 7);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function upsertApplicantFromFirebase(decoded, extras = {}) {
  let applicant = await Applicant.findOne({ firebaseUid: decoded.uid });

  // Link existing admin-created profile by email/phone when first Firebase login happens
  if (!applicant && decoded.email) {
    applicant = await Applicant.findOne({ email: decoded.email, firebaseUid: { $in: [null, undefined] } });
  }
  if (!applicant && decoded.phone) {
    applicant = await Applicant.findOne({ phone: decoded.phone, firebaseUid: { $in: [null, undefined] } });
  }

  if (!applicant) {
    applicant = new Applicant({
      firebaseUid: decoded.uid,
      createdVia: 'website',
    });
  }

  applicant.firebaseUid = decoded.uid;
  if (decoded.email) applicant.email = decoded.email;
  if (decoded.phone) applicant.phone = decoded.phone;
  if (decoded.displayName) applicant.displayName = decoded.displayName;
  if (decoded.firstName && !applicant.firstName) applicant.firstName = decoded.firstName;
  if (decoded.lastName && !applicant.lastName) applicant.lastName = decoded.lastName;
  if (decoded.photoURL) applicant.photoURL = decoded.photoURL;
  if (decoded.emailVerified) applicant.isEmailVerified = true;
  if (decoded.phoneVerified) applicant.isPhoneVerified = true;

  if (extras.firstName) applicant.firstName = extras.firstName;
  if (extras.lastName) applicant.lastName = extras.lastName;
  if (extras.displayName) applicant.displayName = extras.displayName;

  const providers = new Set(applicant.authProviders || []);
  if (decoded.provider) providers.add(decoded.provider);
  applicant.authProviders = [...providers];
  applicant.lastLoginAt = new Date();
  applicant.isActive = true;

  await applicant.save();
  return applicant;
}

async function issueApplicantSession(applicant, meta = {}) {
  const jti = randomToken(16);
  const accessToken = signApplicantAccessToken(applicant);
  const refreshToken = signApplicantRefreshToken(applicant, jti);

  await ApplicantRefreshToken.create({
    applicant: applicant._id,
    tokenHash: sha256(refreshToken),
    expiresAt: refreshExpiryDate(),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    applicant: applicant.toJSON(),
  };
}

/**
 * Website signup/login entry:
 * Client signs in with Firebase (Google / Email / Phone),
 * then posts the Firebase ID token here.
 */
async function loginWithFirebase({ idToken, profile, meta }) {
  const decoded = await verifyFirebaseIdToken(idToken);
  const applicant = await upsertApplicantFromFirebase(decoded, profile || {});

  const session = await issueApplicantSession(applicant, meta);

  await writeAudit({
    action: 'applicant.firebase_login',
    resourceType: 'Applicant',
    resourceId: applicant._id,
    actorType: 'applicant',
    actorId: applicant._id,
    actorEmail: applicant.email,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    meta: { provider: decoded.provider },
  });

  return {
    ...session,
    auth: {
      provider: decoded.provider,
      firebaseUid: decoded.uid,
      isNewUser: applicant.createdAt.getTime() > Date.now() - 5000,
    },
  };
}

async function refresh({ refreshToken, meta }) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }
  if (payload.typ !== 'refresh' || payload.panel !== 'website') {
    throw new ApiError(401, 'Invalid website refresh token');
  }

  const hash = sha256(refreshToken);
  const stored = await ApplicantRefreshToken.findOne({ tokenHash: hash, revokedAt: null });
  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, 'Refresh token revoked or expired');
  }

  const applicant = await Applicant.findById(payload.sub);
  if (!applicant || !applicant.isActive) {
    throw new ApiError(401, 'Applicant account inactive');
  }

  stored.revokedAt = new Date();
  await stored.save();

  return issueApplicantSession(applicant, meta);
}

async function logout({ refreshToken, applicant }) {
  if (refreshToken) {
    await ApplicantRefreshToken.updateOne(
      { tokenHash: sha256(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  } else if (applicant) {
    await ApplicantRefreshToken.updateMany(
      { applicant: applicant._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
}

module.exports = {
  loginWithFirebase,
  refresh,
  logout,
  upsertApplicantFromFirebase,
  issueApplicantSession,
};
