const jwt = require('jsonwebtoken');
const { ApiError } = require('./error');
const Staff = require('../models/Staff');
const { getEffectivePermissions } = require('../config/permissions');

function signAccessToken(staff) {
  return jwt.sign(
    {
      sub: staff._id.toString(),
      role: staff.role,
      email: staff.email,
      typ: 'access',
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

function signRefreshToken(staff, jti) {
  return jwt.sign(
    {
      sub: staff._id.toString(),
      role: staff.role,
      typ: 'refresh',
      jti,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

async function authenticateStaff(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Missing or invalid Authorization bearer token');
    }

    const payload = verifyAccessToken(token);
    if (payload.typ !== 'access') {
      throw new ApiError(401, 'Invalid token type');
    }

    const staff = await Staff.findById(payload.sub);
    if (!staff || !staff.isActive) {
      throw new ApiError(401, 'Staff account is inactive or not found');
    }

    req.staff = staff;
    req.auth = {
      staffId: staff._id,
      role: staff.role,
      email: staff.email,
      permissions: getEffectivePermissions(staff.role, staff.sectionOverrides),
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Access token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid access token'));
    }
    return next(err);
  }
}

function authHasPermission(auth, permission) {
  const granted = auth?.permissions || [];
  return granted.includes('*') || granted.includes(permission);
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new ApiError(401, 'Unauthorized'));
    }
    const ok = permissions.every((p) => authHasPermission(req.auth, p));
    if (!ok) {
      return next(new ApiError(403, 'Forbidden — insufficient permissions'));
    }
    return next();
  };
}

function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (!req.auth) {
      return next(new ApiError(401, 'Unauthorized'));
    }
    const ok = permissions.some((p) => authHasPermission(req.auth, p));
    if (!ok) {
      return next(new ApiError(403, 'Forbidden — insufficient permissions'));
    }
    return next();
  };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  authenticateStaff,
  requirePermission,
  requireAnyPermission,
};
