const jwt = require('jsonwebtoken');
const { ApiError } = require('./error');
const Embassy = require('../models/Embassy');
const EmbassyStaff = require('../models/EmbassyStaff');
const {
  EMBASSY_ROLES,
  embassyRoleHasPermission,
  getEmbassyPermissionsForRole,
} = require('../config/embassyPermissions');

const ACTOR_TYPES = Object.freeze({
  EMBASSY: 'embassy',
  STAFF: 'staff',
});

function resolveEmbassyIdFromStaff(embassyStaff) {
  const embassy = embassyStaff.embassy;
  if (!embassy) return undefined;
  if (typeof embassy === 'object' && embassy._id) return embassy._id.toString();
  return embassy.toString();
}

function buildEmbassySessionStaff(embassy) {
  const embassyMeta = {
    _id: embassy._id,
    name: embassy.name,
    code: embassy.code,
    isActive: embassy.isActive,
  };

  return {
    _id: embassy._id,
    firstName: embassy.name,
    lastName: 'Admin',
    email: embassy.email,
    role: EMBASSY_ROLES.EMBASSY_ADMIN,
    accessMode: 'all',
    isActive: embassy.isActive,
    embassy: embassyMeta,
    toJSON() {
      return {
        _id: this._id,
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        role: this.role,
        accessMode: this.accessMode,
        isActive: this.isActive,
        embassy: this.embassy,
      };
    },
  };
}

function signEmbassyAccessToken(session) {
  return jwt.sign(
    {
      sub: session.sub,
      actorType: session.actorType,
      role: session.role,
      email: session.email,
      embassyId: session.embassyId,
      panel: 'embassy',
      typ: 'access',
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

function signEmbassyRefreshToken(session, jti) {
  return jwt.sign(
    {
      sub: session.sub,
      actorType: session.actorType,
      role: session.role,
      embassyId: session.embassyId,
      panel: 'embassy',
      typ: 'refresh',
      jti,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
}

function resolveActorType(payload) {
  if (payload.actorType === ACTOR_TYPES.EMBASSY || payload.actorType === ACTOR_TYPES.STAFF) {
    return payload.actorType;
  }
  if (payload.role === EMBASSY_ROLES.EMBASSY_ADMIN) return ACTOR_TYPES.EMBASSY;
  return ACTOR_TYPES.STAFF;
}

async function loadEmbassySessionActor(payload) {
  const actorType = resolveActorType(payload);

  if (actorType === ACTOR_TYPES.EMBASSY) {
    const embassy = await Embassy.findById(payload.sub);
    if (!embassy || !embassy.isActive) {
      throw new ApiError(401, 'Embassy account is inactive or not found');
    }
    return {
      actorType: ACTOR_TYPES.EMBASSY,
      embassy,
      embassyStaff: buildEmbassySessionStaff(embassy),
      embassyId: embassy._id,
    };
  }

  const embassyStaff = await EmbassyStaff.findById(payload.sub).populate('embassy', 'name code isActive');
  if (!embassyStaff || !embassyStaff.isActive) {
    throw new ApiError(401, 'Embassy staff account is inactive or not found');
  }
  if (embassyStaff.embassy && embassyStaff.embassy.isActive === false) {
    throw new ApiError(403, 'Embassy is inactive');
  }

  return {
    actorType: ACTOR_TYPES.STAFF,
    embassyStaff,
    embassyId: embassyStaff.embassy._id || embassyStaff.embassy,
  };
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

    const session = await loadEmbassySessionActor(payload);

    req.embassyStaff = session.embassyStaff;
    req.embassyId = session.embassyId;
    req.embassyAuth = {
      actorType: session.actorType,
      embassyStaffId: session.embassyStaff._id,
      embassyId: session.embassyId,
      role: session.embassyStaff.role,
      email: session.embassyStaff.email,
      accessMode: session.embassyStaff.accessMode,
      permissions: getEmbassyPermissionsForRole(session.embassyStaff.role),
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
  ACTOR_TYPES,
  buildEmbassySessionStaff,
  signEmbassyAccessToken,
  signEmbassyRefreshToken,
  authenticateEmbassyStaff,
  requireEmbassyPermission,
  requireAnyEmbassyPermission,
  loadEmbassySessionActor,
  resolveActorType,
};
