const { body } = require('express-validator');
const Application = require('../../models/Application');
const Applicant = require('../../models/Applicant');
const ApplicationDocument = require('../../models/ApplicationDocument');
const Payment = require('../../models/Payment');
const VisaType = require('../../models/VisaType');
const IssuedVisa = require('../../models/IssuedVisa');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const {
  parsePagination,
  escapeRegex,
  generateReferenceId,
  buildDateRangeFilter,
} = require('../../utils/helpers');
const { changeApplicationStatus, APPLICATION_STATUSES } = require('../../services/statusService');
const { getAllowedNextStatuses } = require('../../config/statusWorkflow');
const { ROLES } = require('../../config/permissions');
const { auditFromReq } = require('../../services/auditService');
const { issueVisaForApplication } = require('../../services/visaGenerationService');
const PlatformSettings = require('../../models/PlatformSettings');

const createValidators = [
  body('visaTypeCode').notEmpty(),
  body('personal.fullName').notEmpty(),
  body('personal.email').isEmail(),
  body('personal.nationality').notEmpty(),
];

function buildApplicationFilter(query) {
  const filter = { isArchived: query.includeArchived === 'true' ? { $in: [true, false] } : false };
  if (query.status) filter.status = query.status;
  if (query.visaTypeCode) filter.visaTypeCode = query.visaTypeCode;
  if (query.embassy) filter.embassy = query.embassy;
  if (query.channel) filter.channel = query.channel;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.source) filter.source = query.source;
  if (query.assignedCaseManager) filter.assignedCaseManager = query.assignedCaseManager;

  Object.assign(filter, buildDateRangeFilter(query, query.dateField || 'createdAt'));

  if (query.q) {
    const q = escapeRegex(query.q);
    filter.$or = [
      { referenceId: new RegExp(q, 'i') },
      { 'personal.fullName': new RegExp(q, 'i') },
      { 'personal.email': new RegExp(q, 'i') },
      { 'passport.passportNumber': new RegExp(q, 'i') },
    ];
  }
  return filter;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildApplicationFilter(req.query);

  const [data, total] = await Promise.all([
    Application.find(filter)
      .populate('embassy', 'name code')
      .populate('assignedCaseManager', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
  ]);

  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getById = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id)
    .populate('embassy')
    .populate('assignedCaseManager', 'firstName lastName email role')
    .populate('applicant', 'email firstName lastName phone nationality countryOfResidence')
    .lean();
  if (!application) throw new ApiError(404, 'Application not found');

  const [documents, payments, issuedVisa] = await Promise.all([
    ApplicationDocument.find({ application: application._id, isDeleted: false }).sort({ createdAt: -1 }),
    Payment.find({ application: application._id }).sort({ createdAt: -1 }),
    IssuedVisa.findOne({ application: application._id }),
  ]);

  return success(res, {
    ...application,
    documents,
    payments,
    issuedVisa,
    allowedNextStatuses: getAllowedNextStatuses(application.status, {
      isReceptionist: req.staff.role === ROLES.RECEPTIONIST,
    }),
  });
});

const createManual = asyncHandler(async (req, res) => {
  const settings = await PlatformSettings.findOne({ key: 'default' }).lean();
  if (settings?.system?.allowManualApplications === false) {
    throw new ApiError(403, 'Manual application creation is disabled');
  }

  const visaType = await VisaType.findOne({ code: req.body.visaTypeCode, isActive: true });
  if (!visaType) throw new ApiError(400, 'Invalid or inactive visa type');

  let applicant = await Applicant.findOne({ email: req.body.personal.email.toLowerCase() });
  if (!applicant) {
    applicant = await Applicant.create({
      email: req.body.personal.email.toLowerCase(),
      firstName: req.body.personal.fullName?.split(' ')[0],
      lastName: req.body.personal.fullName?.split(' ').slice(1).join(' ') || undefined,
      phone: req.body.personal.phone,
      nationality: req.body.personal.nationality,
      countryOfResidence: req.body.personal.countryOfResidence,
      createdVia: req.body.source === 'receptionist' ? 'receptionist' : 'admin_manual',
      createdByStaff: req.staff._id,
    });
  }

  const application = await Application.create({
    referenceId: generateReferenceId('SA'),
    applicant: applicant._id,
    visaTypeCode: visaType.code,
    channel: visaType.channel,
    status: req.body.submit === false ? APPLICATION_STATUSES.DRAFT : APPLICATION_STATUSES.PENDING,
    source: req.body.source || 'admin_manual',
    personal: {
      ...req.body.personal,
      email: req.body.personal.email.toLowerCase(),
      nationality: String(req.body.personal.nationality).toUpperCase(),
      countryOfResidence: req.body.personal.countryOfResidence
        ? String(req.body.personal.countryOfResidence).toUpperCase()
        : undefined,
    },
    passport: req.body.passport || {},
    travel: req.body.travel || {},
    embassy: req.body.embassy,
    assignedCaseManager: req.body.assignedCaseManager || req.staff._id,
    formAnswers: req.body.formAnswers || {},
    submittedAt: req.body.submit === false ? undefined : new Date(),
    createdByStaff: req.staff._id,
    activity: [
      {
        action: 'created',
        toStatus: req.body.submit === false ? APPLICATION_STATUSES.DRAFT : APPLICATION_STATUSES.PENDING,
        note: 'Manual application created',
        actorType: 'staff',
        actorId: req.staff._id,
        actorRole: req.staff.role,
        actorName: `${req.staff.firstName} ${req.staff.lastName}`,
        at: new Date(),
      },
    ],
  });

  await auditFromReq(req, {
    action: 'application.create_manual',
    resourceType: 'Application',
    resourceId: application._id,
    after: { referenceId: application.referenceId, status: application.status },
  });

  return success(res, application, null, 201);
});

const update = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found');

  const before = {
    personal: application.personal,
    passport: application.passport,
    travel: application.travel,
    embassy: application.embassy,
  };

  if (req.body.personal) Object.assign(application.personal, req.body.personal);
  if (req.body.passport) application.passport = { ...(application.passport?.toObject?.() || application.passport || {}), ...req.body.passport };
  if (req.body.travel) Object.assign(application.travel, req.body.travel);
  if (req.body.embassy !== undefined) application.embassy = req.body.embassy;
  if (req.body.assignedCaseManager !== undefined) {
    application.assignedCaseManager = req.body.assignedCaseManager;
  }
  if (req.body.formAnswers) {
    application.formAnswers = req.body.formAnswers;
  }

  application.activity.push({
    action: 'updated',
    note: req.body.note || 'Application details updated',
    actorType: 'staff',
    actorId: req.staff._id,
    actorRole: req.staff.role,
    actorName: `${req.staff.firstName} ${req.staff.lastName}`,
    at: new Date(),
  });

  await application.save();
  await auditFromReq(req, {
    action: 'application.update',
    resourceType: 'Application',
    resourceId: application._id,
    before,
    after: {
      personal: application.personal,
      passport: application.passport,
      travel: application.travel,
      embassy: application.embassy,
    },
  });

  return success(res, application);
});

const changeStatus = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found');

  if (req.body.toStatus === APPLICATION_STATUSES.SENT_TO_EMBASSY && !req.body.embassy && !application.embassy) {
    throw new ApiError(400, 'embassy is required before sending to embassy');
  }
  if (req.body.embassy) application.embassy = req.body.embassy;

  const updated = await changeApplicationStatus({
    application,
    toStatus: req.body.toStatus,
    staff: req.staff,
    note: req.body.note,
    meta: req.body.meta,
  });

  const settings = await PlatformSettings.findOne({ key: 'default' }).lean();
  let issuedVisa = null;
  // Admin UI does preview-first issue; pass autoIssueVisa: false to skip.
  if (
    req.body.toStatus === APPLICATION_STATUSES.APPROVED &&
    req.body.autoIssueVisa !== false &&
    settings?.system?.autoGenerateVisaOnApprove !== false
  ) {
    issuedVisa = await issueVisaForApplication({
      applicationId: updated._id,
      staff: req.staff,
      sendEmail: req.body.sendEmail !== false,
    });
  }

  const fresh = await Application.findById(updated._id);

  await auditFromReq(req, {
    action: 'application.status_change',
    resourceType: 'Application',
    resourceId: updated._id,
    after: { status: fresh.status, note: req.body.note },
  });

  return success(res, { application: fresh, issuedVisa });
});

const addNote = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found');
  if (!req.body.note?.trim()) throw new ApiError(400, 'Note is required');

  const note = String(req.body.note).trim();
  const actorName = `${req.staff.firstName || ''} ${req.staff.lastName || ''}`.trim() || 'Staff';

  application.activity.push({
    action: 'note',
    note,
    actorType: 'staff',
    actorId: req.staff._id,
    actorRole: req.staff.role,
    actorName,
    at: new Date(),
  });
  await application.save();

  if (application.applicant && application.personal?.email) {
    const { notifyApplicant } = require('../../services/emailService');
    await notifyApplicant({
      applicantId: application.applicant,
      email: application.personal.email,
      type: 'staff_message',
      title: `Message on ${application.referenceId}`,
      body: note,
      applicationId: application._id,
      templateCode: 'application_status_change',
      vars: {
        referenceId: application.referenceId,
        note,
        fullName: application.personal.fullName || '',
      },
    });
  }

  return success(res, application);
});

module.exports = {
  createValidators,
  list,
  getById,
  createManual,
  update,
  changeStatus,
  addNote,
  buildApplicationFilter,
};
