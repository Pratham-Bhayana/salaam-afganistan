const path = require('path');
const fs = require('fs');
const Application = require('../../models/Application');
const ApplicationDocument = require('../../models/ApplicationDocument');
const IssuedVisa = require('../../models/IssuedVisa');
const EmbassyStaff = require('../../models/EmbassyStaff');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const { parsePagination } = require('../../utils/helpers');
const { changeApplicationStatus, APPLICATION_STATUSES } = require('../../services/statusService');
const { getAllowedNextStatuses } = require('../../config/statusWorkflow');
const {
  issueVisaForApplication,
  previewVisaForApplication,
  draftFieldsFromApplication,
} = require('../../services/visaGenerationService');
const { activityFromReq } = require('../../services/embassyActivityService');
const {
  buildEmbassyApplicationFilter,
  assertEmbassyApplicationAccess,
} = require('../../services/embassyAccessService');
const { uploadRoot } = require('../../middleware/upload');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = buildEmbassyApplicationFilter(req, req.query);

  const [data, total] = await Promise.all([
    Application.find(filter)
      .populate('assignedEmbassyStaff', 'firstName lastName email role')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
  ]);

  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getById = asyncHandler(async (req, res) => {
  const application = await assertEmbassyApplicationAccess(req, req.params.id);
  const populated = await Application.findById(application._id)
    .populate('assignedEmbassyStaff', 'firstName lastName email role')
    .populate('applicant', 'email firstName lastName phone')
    .lean();

  const [documents, issuedVisa] = await Promise.all([
    ApplicationDocument.find({
      application: application._id,
      isDeleted: false,
      category: { $ne: 'internal' },
    }).sort({ createdAt: -1 }),
    IssuedVisa.findOne({ application: application._id }),
  ]);

  await activityFromReq(req, {
    action: 'application.view',
    resourceType: 'Application',
    resourceId: application._id,
    application: application._id,
  });

  return success(res, {
    ...populated,
    documents,
    issuedVisa,
    allowedNextStatuses: getAllowedNextStatuses(populated.status, { isEmbassy: true }),
  });
});

const decide = asyncHandler(async (req, res) => {
  const application = await assertEmbassyApplicationAccess(req, req.params.id);

  const updated = await changeApplicationStatus({
    application,
    toStatus: req.body.toStatus,
    embassyStaff: req.embassyStaff,
    note: req.body.note,
    meta: { panel: 'embassy', ...(req.body.meta || {}) },
  });

  // Embassy never auto-issues on approve — staff uses Generate visa (preview → edit → send).
  // Explicit autoIssueVisa: true remains available for automation/tests.
  let issuedVisa = null;
  if (req.body.toStatus === APPLICATION_STATUSES.APPROVED && req.body.autoIssueVisa === true) {
    try {
      issuedVisa = await issueVisaForApplication({
        applicationId: updated._id,
        embassyStaff: req.embassyStaff,
      });
    } catch (err) {
      console.error('Embassy auto visa issue failed:', err.message);
    }
  }

  const fresh = await Application.findById(updated._id);

  await activityFromReq(req, {
    action: 'application.decide',
    resourceType: 'Application',
    resourceId: fresh._id,
    application: fresh._id,
    meta: { toStatus: fresh.status, note: req.body.note },
  });

  return success(res, { application: fresh, issuedVisa });
});

const visaDraft = asyncHandler(async (req, res) => {
  const application = await assertEmbassyApplicationAccess(req, req.params.id);
  return success(res, {
    applicationId: application._id,
    referenceId: application.referenceId,
    status: application.status,
    visaTypeCode: application.visaTypeCode,
    draftFields: draftFieldsFromApplication(application),
    applicantEmail: application.personal?.email || '',
    applicantName: application.personal?.fullName || application.passport?.fullName || '',
  });
});

const previewVisa = asyncHandler(async (req, res) => {
  const application = await assertEmbassyApplicationAccess(req, req.params.id);
  const preview = await previewVisaForApplication({
    applicationId: application._id,
    fieldOverrides: req.body?.fieldOverrides || req.body?.overrides || undefined,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${preview.fileName}"`);
  res.setHeader('X-Visa-Preview-Number', preview.visaNumber);
  res.setHeader('X-Visa-Reference-Id', preview.referenceId || '');
  res.setHeader('X-Applicant-Email', preview.applicantEmail || '');
  res.setHeader('X-Applicant-Name', encodeURIComponent(preview.applicantName || ''));
  return res.status(200).send(preview.buffer);
});

const issueVisa = asyncHandler(async (req, res) => {
  const application = await assertEmbassyApplicationAccess(req, req.params.id);
  const sendEmail = req.body.sendEmail !== false && req.body.sendEmail !== 'false';
  const issued = await issueVisaForApplication({
    applicationId: application._id,
    embassyStaff: req.embassyStaff,
    force: !!req.body.force,
    sendEmail,
    fieldOverrides: req.body.fieldOverrides || req.body.overrides || undefined,
  });

  await activityFromReq(req, {
    action: 'visa.issue',
    resourceType: 'IssuedVisa',
    resourceId: issued._id,
    application: application._id,
    meta: { visaNumber: issued.visaNumber, sendEmail },
  });

  return success(res, issued, null, 201);
});

const assign = asyncHandler(async (req, res) => {
  const application = await assertEmbassyApplicationAccess(req, req.params.id);
  const staffId = req.body.embassyStaffId || null;

  if (staffId) {
    const target = await EmbassyStaff.findOne({
      _id: staffId,
      embassy: req.embassyId,
      isActive: true,
    });
    if (!target) throw new ApiError(400, 'Target embassy staff not found in this embassy');
  }

  application.assignedEmbassyStaff = staffId;
  application.activity.push({
    action: 'assigned',
    note: staffId ? `Assigned to embassy staff ${staffId}` : 'Unassigned',
    actorType: 'embassy',
    actorId: req.embassyStaff._id,
    actorRole: req.embassyStaff.role,
    actorName: `${req.embassyStaff.firstName} ${req.embassyStaff.lastName}`,
    at: new Date(),
  });
  await application.save();

  await activityFromReq(req, {
    action: 'application.assign',
    resourceType: 'Application',
    resourceId: application._id,
    application: application._id,
    meta: { assignedEmbassyStaff: staffId },
  });

  return success(res, application);
});

const addNote = asyncHandler(async (req, res) => {
  const application = await assertEmbassyApplicationAccess(req, req.params.id);
  application.activity.push({
    action: 'note',
    note: req.body.note,
    actorType: 'embassy',
    actorId: req.embassyStaff._id,
    actorRole: req.embassyStaff.role,
    actorName: `${req.embassyStaff.firstName} ${req.embassyStaff.lastName}`,
    at: new Date(),
  });
  await application.save();
  return success(res, application);
});

const viewDocument = asyncHandler(async (req, res) => {
  await assertEmbassyApplicationAccess(req, req.params.id);
  const doc = await ApplicationDocument.findOne({
    _id: req.params.documentId,
    application: req.params.id,
    isDeleted: false,
  });
  if (!doc) throw new ApiError(404, 'Document not found');

  await activityFromReq(req, {
    action: 'document.view',
    resourceType: 'ApplicationDocument',
    resourceId: doc._id,
    application: req.params.id,
  });

  const absolute = path.join(uploadRoot, doc.storagePath);
  if (!fs.existsSync(absolute)) throw new ApiError(404, 'File missing on storage');

  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
  return fs.createReadStream(absolute).pipe(res);
});

module.exports = {
  list,
  getById,
  decide,
  assign,
  addNote,
  viewDocument,
  visaDraft,
  previewVisa,
  issueVisa,
};
