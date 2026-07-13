const { body } = require('express-validator');
const Application = require('../../models/Application');
const ApplicationDocument = require('../../models/ApplicationDocument');
const IssuedVisa = require('../../models/IssuedVisa');
const Payment = require('../../models/Payment');
const VisaType = require('../../models/VisaType');
const Notification = require('../../models/Notification');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const {
  parsePagination,
  generateReferenceId,
} = require('../../utils/helpers');
const { APPLICATION_STATUSES } = require('../../config/statusWorkflow');
const { assertOwnApplication } = require('../../services/websiteAccessService');

const listMine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { applicant: req.applicant._id };
  if (req.query.status) filter.status = req.query.status;

  const [data, total] = await Promise.all([
    Application.find(filter)
      .select(
        'referenceId visaTypeCode channel status paymentStatus personal.fullName travel submittedAt createdAt updatedAt issuedAt'
      )
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
  ]);

  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getMine = asyncHandler(async (req, res) => {
  const application = await assertOwnApplication(req, req.params.id);

  const [documents, payments, issuedVisa, notifications] = await Promise.all([
    ApplicationDocument.find({
      application: application._id,
      isDeleted: false,
      visibleToApplicant: true,
    }).sort({ createdAt: -1 }),
    Payment.find({ application: application._id })
      .select('-rawProviderPayload')
      .sort({ createdAt: -1 }),
    IssuedVisa.findOne({ application: application._id }).select(
      'visaNumber referenceId validFrom validUntil entries issuedAt storagePath'
    ),
    Notification.find({
      audience: 'applicant',
      recipientId: req.applicant._id,
      application: application._id,
    })
      .sort({ createdAt: -1 })
      .limit(20),
  ]);

  // Public-safe activity (hide internal staff-only meta if needed)
  const activity = (application.activity || []).map((a) => ({
    action: a.action,
    fromStatus: a.fromStatus,
    toStatus: a.toStatus,
    note: a.note,
    at: a.at,
  }));

  return success(res, {
    ...application.toJSON(),
    activity,
    documents,
    payments,
    issuedVisa,
    recentNotifications: notifications,
    updates: {
      status: application.status,
      documentRequestNote: application.documentRequestNote,
      rejectionReason: application.rejectionReason,
      requestedDocuments: application.requestedDocuments || [],
      lastUpdatedAt: application.updatedAt,
    },
  });
});

const createDraft = asyncHandler(async (req, res) => {
  const visaType = await VisaType.findOne({ code: req.body.visaTypeCode, isActive: true });
  if (!visaType) throw new ApiError(400, 'Invalid or inactive visa type');

  const personal = {
    fullName:
      req.body.personal?.fullName ||
      req.applicant.displayName ||
      `${req.applicant.firstName || ''} ${req.applicant.lastName || ''}`.trim(),
    email: req.body.personal?.email || req.applicant.email,
    phone: req.body.personal?.phone || req.applicant.phone,
    dateOfBirth: req.body.personal?.dateOfBirth || req.applicant.dateOfBirth,
    sex: req.body.personal?.sex || req.applicant.sex,
    nationality: (req.body.personal?.nationality || req.applicant.nationality || '').toUpperCase() || undefined,
    countryOfResidence:
      (req.body.personal?.countryOfResidence || req.applicant.countryOfResidence || '').toUpperCase() ||
      undefined,
  };

  const application = await Application.create({
    referenceId: generateReferenceId('SA'),
    applicant: req.applicant._id,
    visaTypeCode: visaType.code,
    channel: visaType.channel,
    status: APPLICATION_STATUSES.DRAFT,
    source: 'website',
    personal,
    passport: req.body.passport || {},
    travel: req.body.travel || {},
    formAnswers: req.body.formAnswers || {},
    activity: [
      {
        action: 'created',
        toStatus: APPLICATION_STATUSES.DRAFT,
        note: 'Draft started on website',
        actorType: 'applicant',
        actorId: req.applicant._id,
        actorName: personal.fullName || 'Applicant',
        at: new Date(),
      },
    ],
  });

  return success(res, application, null, 201);
});

const updateDraft = asyncHandler(async (req, res) => {
  const application = await assertOwnApplication(req, req.params.id);

  if (![APPLICATION_STATUSES.DRAFT, APPLICATION_STATUSES.DOCUMENTS_REQUIRED].includes(application.status)) {
    // Allow limited personal/travel edits only in draft; docs_required only notes via uploads
    if (application.status !== APPLICATION_STATUSES.DRAFT) {
      throw new ApiError(400, 'Only draft applications can be fully edited');
    }
  }

  if (application.status === APPLICATION_STATUSES.DRAFT) {
    if (req.body.personal) Object.assign(application.personal, req.body.personal);
    if (req.body.passport) {
      application.passport = {
        ...(application.passport?.toObject?.() || application.passport || {}),
        ...req.body.passport,
      };
    }
    if (req.body.travel) Object.assign(application.travel, req.body.travel);
    if (req.body.formAnswers) application.formAnswers = req.body.formAnswers;
    if (req.body.visaTypeCode && req.body.visaTypeCode !== application.visaTypeCode) {
      const visaType = await VisaType.findOne({ code: req.body.visaTypeCode, isActive: true });
      if (!visaType) throw new ApiError(400, 'Invalid visa type');
      application.visaTypeCode = visaType.code;
      application.channel = visaType.channel;
    }
  }

  application.activity.push({
    action: 'updated',
    note: 'Applicant updated application',
    actorType: 'applicant',
    actorId: req.applicant._id,
    actorName: application.personal?.fullName || 'Applicant',
    at: new Date(),
  });

  await application.save();
  return success(res, application);
});

const submit = asyncHandler(async (req, res) => {
  const application = await assertOwnApplication(req, req.params.id);

  if (application.status !== APPLICATION_STATUSES.DRAFT) {
    throw new ApiError(400, 'Only draft applications can be submitted');
  }

  if (!application.personal?.fullName || !application.personal?.nationality) {
    throw new ApiError(400, 'fullName and nationality are required before submit');
  }
  if (!application.personal?.email && !application.personal?.phone) {
    throw new ApiError(400, 'email or phone is required before submit');
  }
  if (!application.travel?.purpose || !application.travel?.intendedEntryDate) {
    throw new ApiError(400, 'travel purpose and intendedEntryDate are required');
  }

  const fromStatus = application.status;
  application.status = APPLICATION_STATUSES.PENDING;
  application.submittedAt = new Date();
  application.activity.push({
    action: 'submitted',
    fromStatus,
    toStatus: APPLICATION_STATUSES.PENDING,
    note: 'Submitted from website',
    actorType: 'applicant',
    actorId: req.applicant._id,
    actorName: application.personal?.fullName || 'Applicant',
    at: new Date(),
  });

  await application.save();

  await Notification.create({
    audience: 'applicant',
    recipientId: req.applicant._id,
    channel: 'both',
    type: 'application_submitted',
    title: `Application ${application.referenceId} submitted`,
    body: 'Your visa application was submitted and is pending review.',
    application: application._id,
  });

  return success(res, application);
});

module.exports = {
  createValidators: [body('visaTypeCode').notEmpty()],
  listMine,
  getMine,
  createDraft,
  updateDraft,
  submit,
};
