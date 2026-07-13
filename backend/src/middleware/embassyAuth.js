const jwt = require('jsonwebtoken');
const { ApiError } = require('./error');
const EmbassyStaff = require('../models/EmbassyStaff');
const {
  embassyRoleHasPermission,
  getEmbassyPermissionsForRole,
} = require('../config/embassyPermissions');

function signEmbassyAccessToken(embassyStaff) {
  return jwt.sign(
    {
      sub: embassyStaff._id.toString(),
      role: embassyStaff.role,
      email: embassyStaff.email,
      embassyId: embassyStaff.embassy.toString(),
      panel: 'embassy',
      typ: 'access',
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

function signEmbassyRefreshToken(embassyStaff, jti) {
  return jwt.sign(
    {
      sub: embassyStaff._id.toString(),
      role: embassyStaff.role,
      embassyId: embassyStaff.embassy.toString(),
      panel: 'embassy',
      typ: 'refresh',
      jti,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
}

async function authenticateEmbassyStaff(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Missing or invalid Authorization bearer token');
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    if (payload.typ !== 'access' || payload.panel !== 'embassy') {
      throw new ApiError(401, 'Invalid embassy access token');
    }

    const embassyStaff = await EmbassyStaff.findById(payload.sub).populate('embassy', 'name code isActive');
    if (!embassyStaff || !embassyStaff.isActive) {
      throw new ApiError(401, 'Embassy staff account is inactive or not found');
    }
    if (embassyStaff.embassy && embassyStaff.embassy.isActive === false) {
      throw new ApiError(403, 'Embassy is inactive');
    }

    req.embassyStaff = embassyStaff;
    req.embassyId = embassyStaff.embassy._id || embassyStaff.embassy;
    req.embassyAuth = {
      embassyStaffId: embassyStaff._id,
      embassyId: req.embassyId,
      role: embassyStaff.role,
      email: embassyStaff.email,
      accessMode: embassyStaff.accessMode,
      permissions: getEmbassyPermissionsForRole(embassyStaff.role),
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

function requireEmbassyPermission(...permissions) {
  return (req, res, next) => {
    if (!req.embassyAuth) {
      return next(new ApiError(401, 'Unauthorized'));
    }
    const ok = permissions.every((p) =>
      embassyRoleHasPermission(req.embassyAuth.role, p)
    );
    if (!ok) {
      return next(new ApiError(403, 'Forbidden — insufficient embassy permissions'));
    }
    return next();
  };
}

function requireAnyEmbassyPermission(...permissions) {
  return (req, res, next) => {
    if (!req.embassyAuth) {
      return next(new ApiError(401, 'Unauthorized'));
    }
    const ok = permissions.some((p) =>
      embassyRoleHasPermission(req.embassyAuth.role, p)
    );
    if (!ok) {
      return next(new ApiError(403, 'Forbidden — insufficient embassy permissions'));
    }
    return next();
  };
}

module.exports = {
  signEmbassyAccessToken,
  signEmbassyRefreshToken,
  authenticateEmbassyStaff,
  requireEmbassyPermission,
  requireAnyEmbassyPermission,
};
