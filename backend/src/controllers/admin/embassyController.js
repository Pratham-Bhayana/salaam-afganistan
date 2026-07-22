const Embassy = require('../../models/Embassy');
const EmbassyStaff = require('../../models/EmbassyStaff');
const EmbassyRefreshToken = require('../../models/EmbassyRefreshToken');
const Application = require('../../models/Application');
const ChatRoom = require('../../models/ChatRoom');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const { parsePagination, escapeRegex } = require('../../utils/helpers');
const { auditFromReq } = require('../../services/auditService');
const { APPLICATION_STATUSES } = require('../../config/statusWorkflow');
const { EMBASSY_ROLES } = require('../../config/embassyPermissions');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.q) {
    const q = escapeRegex(req.query.q);
    filter.$or = [{ name: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }];
  }

  const [data, total] = await Promise.all([
    Embassy.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Embassy.countDocuments(filter),
  ]);
  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getById = asyncHandler(async (req, res) => {
  const embassy = await Embassy.findById(req.params.id);
  if (!embassy) throw new ApiError(404, 'Embassy not found');

  const pipeline = [
    { $match: { embassy: embassy._id, status: { $in: [
      APPLICATION_STATUSES.SENT_TO_EMBASSY,
      APPLICATION_STATUSES.UNDER_EMBASSY_REVIEW,
      APPLICATION_STATUSES.APPROVED,
      APPLICATION_STATUSES.REJECTED,
      APPLICATION_STATUSES.DOCUMENTS_REQUIRED,
      APPLICATION_STATUSES.VISA_ISSUED,
    ] } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ];
  const statusCounts = await Application.aggregate(pipeline);

  return success(res, { embassy, statusCounts });
});

const create = asyncHandler(async (req, res) => {
  const embassy = await Embassy.create({
    code: String(req.body.code).toUpperCase(),
    name: req.body.name,
    logoUrl: req.body.logoUrl,
    branding: req.body.branding,
    contact: req.body.contact,
    jurisdictionCountries: (req.body.jurisdictionCountries || []).map((c) => String(c).toUpperCase()),
    supportedVisaTypeCodes: req.body.supportedVisaTypeCodes || [],
    isActive: req.body.isActive !== false,
    notes: req.body.notes,
  });

  await ChatRoom.create({
    embassy: embassy._id,
    type: 'general',
    title: `${embassy.name} — General Coordination`,
    createdBy: req.staff._id,
  });

  await auditFromReq(req, {
    action: 'embassy.create',
    resourceType: 'Embassy',
    resourceId: embassy._id,
    after: embassy.toObject(),
  });

  return success(res, embassy, null, 201);
});

const update = asyncHandler(async (req, res) => {
  const embassy = await Embassy.findById(req.params.id);
  if (!embassy) throw new ApiError(404, 'Embassy not found');
  const before = embassy.toObject();

  const fields = [
    'name',
    'logoUrl',
    'branding',
    'contact',
    'jurisdictionCountries',
    'supportedVisaTypeCodes',
    'isActive',
    'notes',
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) embassy[f] = req.body[f];
  });
  if (req.body.jurisdictionCountries) {
    embassy.jurisdictionCountries = req.body.jurisdictionCountries.map((c) => String(c).toUpperCase());
  }
  await embassy.save();

  await auditFromReq(req, {
    action: 'embassy.update',
    resourceType: 'Embassy',
    resourceId: embassy._id,
    before,
    after: embassy.toObject(),
  });

  return success(res, embassy);
});

const applicationsForEmbassy = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { embassy: req.params.id };
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    Application.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit)
      .select('referenceId status visaTypeCode personal.fullName personal.nationality sentToEmbassyAt decidedAt'),
    Application.countDocuments(filter),
  ]);

  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const remove = asyncHandler(async (req, res) => {
  const embassy = await Embassy.findById(req.params.id);
  if (!embassy) throw new ApiError(404, 'Embassy not found');
  if (embassy.isActive) {
    throw new ApiError(400, 'Only inactive embassies can be deleted');
  }

  const before = embassy.toObject();
  await Embassy.deleteOne({ _id: embassy._id });

  await auditFromReq(req, {
    action: 'embassy.delete',
    resourceType: 'Embassy',
    resourceId: embassy._id,
    before,
  });

  return success(res, { deleted: true, id: embassy._id });
});

const resetPassword = asyncHandler(async (req, res) => {
  const newPassword = String(req.body.newPassword || '');
  if (newPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  const embassy = await Embassy.findById(req.params.id);
  if (!embassy) throw new ApiError(404, 'Embassy not found');

  let staff = await EmbassyStaff.findOne({
    embassy: embassy._id,
    role: EMBASSY_ROLES.EMBASSY_ADMIN,
    isActive: true,
  })
    .select('+passwordHash')
    .sort({ createdAt: 1 });

  if (!staff) {
    staff = await EmbassyStaff.findOne({ embassy: embassy._id, isActive: true })
      .select('+passwordHash')
      .sort({ createdAt: 1 });
  }

  if (!staff) {
    throw new ApiError(404, 'No embassy login account found for this embassy');
  }

  staff.passwordHash = await EmbassyStaff.hashPassword(newPassword);
  staff.passwordResetTokenHash = undefined;
  staff.passwordResetExpiresAt = undefined;
  await staff.save();

  await EmbassyRefreshToken.updateMany(
    { embassyStaff: staff._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );

  await auditFromReq(req, {
    action: 'embassy.reset_password',
    resourceType: 'EmbassyStaff',
    resourceId: staff._id,
    meta: { embassyId: embassy._id, email: staff.email },
  });

  return res.status(200).json({ success: true });
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  applicationsForEmbassy,
  resetPassword,
};
