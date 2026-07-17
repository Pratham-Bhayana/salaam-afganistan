const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { ApiError } = require('../middleware/error');

let initialized = false;

function initFirebase() {
  if (initialized) return true;

  const mode = (process.env.FIREBASE_AUTH_MODE || 'disabled').toLowerCase();

  if (mode === 'disabled') {
    return false;
  }

  if (mode === 'dev') {
    // No real Firebase project required — used for local/API smoke tests only.
    initialized = true;
    return true;
  }

  // mode: live | production | enabled | any other value with service-account credentials
  if (getApps().length) {
    initialized = true;
    return true;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY or FIREBASE_AUTH_MODE=dev'
    );
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  initialized = true;
  return true;
}

/**
 * Verify Firebase ID token from client (Google / Email / Phone).
 *
 * Dev mode token format (FIREBASE_AUTH_MODE=dev):
 *   Base64URL JSON: { "uid":"dev_123", "email":"a@b.com", "phone_number":"+971...", "name":"Jane Doe", "firebase":{"sign_in_provider":"google.com"} }
 *   Or prefix: "dev:" + JSON.stringify(payload)
 */
async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new ApiError(401, 'Firebase ID token is required');
  }

  const mode = (process.env.FIREBASE_AUTH_MODE || 'disabled').toLowerCase();

  if (mode === 'disabled') {
    throw new ApiError(
      503,
      'Firebase auth is not configured. Set FIREBASE_AUTH_MODE=dev or provide Firebase service-account credentials.'
    );
  }

  if (mode === 'dev') {
    return verifyDevToken(idToken);
  }

  initFirebase();
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return normalizeDecoded(decoded);
  } catch (err) {
    throw new ApiError(401, `Invalid Firebase ID token: ${err.message}`);
  }
}

function verifyDevToken(idToken) {
  try {
    let payload;
    if (idToken.startsWith('dev:')) {
      payload = JSON.parse(idToken.slice(4));
    } else {
      const json = Buffer.from(idToken, 'base64url').toString('utf8');
      payload = JSON.parse(json);
    }

    if (!payload.uid) {
      throw new Error('uid is required in dev token');
    }

    return normalizeDecoded({
      uid: payload.uid,
      email: payload.email,
      email_verified: payload.email_verified ?? Boolean(payload.email),
      phone_number: payload.phone_number || payload.phone,
      name: payload.name,
      picture: payload.picture,
      firebase: {
        sign_in_provider:
          payload.firebase?.sign_in_provider ||
          payload.provider ||
          (payload.phone_number ? 'phone' : payload.email ? 'password' : 'custom'),
      },
    });
  } catch (err) {
    throw new ApiError(
      401,
      `Invalid dev Firebase token. Use dev:{"uid":"...","email":"...","name":"..."} — ${err.message}`
    );
  }
}

function normalizeDecoded(decoded) {
  const provider = decoded.firebase?.sign_in_provider || 'custom';
  const name = decoded.name || '';
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return {
    uid: decoded.uid,
    email: decoded.email ? String(decoded.email).toLowerCase() : undefined,
    emailVerified: Boolean(decoded.email_verified),
    phone: decoded.phone_number || undefined,
    phoneVerified: Boolean(decoded.phone_number),
    displayName: name || undefined,
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : undefined,
    photoURL: decoded.picture || undefined,
    provider,
  };
}

module.exports = {
  initFirebase,
  verifyFirebaseIdToken,
};
