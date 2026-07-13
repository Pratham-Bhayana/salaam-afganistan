const jwt = require('jsonwebtoken');
const { ApiError } = require('./error');
const Applicant = require('../models/Applicant');

function signApplicantAccessToken(applicant) {
  return jwt.sign(
    {
      sub: applicant._id.toString(),
      email: applicant.email,
      phone: applicant.phone,
      panel: 'website',
      typ: 'access',
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

function signApplicantRefreshToken(applicant, jti) {
  return jwt.sign(
    {
      sub: applicant._id.toString(),
      panel: 'website',
      typ: 'refresh',
      jti,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
}

async function authenticateApplicant(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(401, 'Missing or invalid Authorization bearer token');
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    if (payload.typ !== 'access' || payload.panel !== 'website') {
      throw new ApiError(401, 'Invalid website access token');
    }

    const applicant = await Applicant.findById(payload.sub);
    if (!applicant || !applicant.isActive) {
      throw new ApiError(401, 'Applicant account is inactive or not found');
    }

    req.applicant = applicant;
    req.applicantAuth = {
      applicantId: applicant._id,
      email: applicant.email,
      phone: applicant.phone,
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

module.exports = {
  signApplicantAccessToken,
  signApplicantRefreshToken,
  authenticateApplicant,
};
