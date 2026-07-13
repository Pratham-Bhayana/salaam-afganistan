const path = require('path');
const fs = require('fs');
const Application = require('../../models/Application');
const ApplicationDocument = require('../../models/ApplicationDocument');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const { uploadRoot } = require('../../middleware/upload');
const { notifyApplicant } = require('../../services/emailService');
const { auditFromReq } = require('../../services/auditService');

const deliverDocument = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found');
  if (!req.file) throw new ApiError(400, 'File is required');

  const storagePath = `deliveries/${req.file.filename}`;
  const doc = await ApplicationDocument.create({
    application: application._id,
    key: req.body.key || 'admin_delivery',
    label: req.body.label || req.file.originalname,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storageProvider: 'local',
    storagePath,
    uploadedByType: 'staff',
    uploadedBy: req.staff._id,
    category: req.body.category || 'admin_delivery',
    visibleToApplicant: req.body.visibleToApplicant !== 'false',
    deliveredAt: new Date(),
  });

  application.activity.push({
    action: 'document_delivered',
    note: req.body.note || `Document delivered: ${doc.label}`,
    actorType: 'staff',
    actorId: req.staff._id,
    actorRole: req.staff.role,
    actorName: `${req.staff.firstName} ${req.staff.lastName}`,
    meta: { documentId: doc._id },
    at: new Date(),
  });
  await application.save();

  if (application.applicant && application.personal?.email && doc.visibleToApplicant) {
    await notifyApplicant({
      applicantId: application.applicant,
      email: application.personal.email,
      type: 'document_delivery',
      title: `New document for ${application.referenceId}`,
      body: req.body.note || `A document (${doc.label}) was added to your application profile.`,
      applicationId: application._id,
      templateCode: 'document_delivery',
      vars: {
        referenceId: application.referenceId,
        documentLabel: doc.label,
        fullName: application.personal.fullName || '',
        note: req.body.note || '',
      },
    });
    doc.emailNotifiedAt = new Date();
    await doc.save();
  }

  await auditFromReq(req, {
    action: 'document.deliver',
    resourceType: 'ApplicationDocument',
    resourceId: doc._id,
    after: doc.toObject(),
  });

  return success(res, doc, null, 201);
});

const downloadDocument = asyncHandler(async (req, res) => {
  const doc = await ApplicationDocument.findById(req.params.documentId);
  if (!doc || doc.isDeleted) throw new ApiError(404, 'Document not found');

  const absolute = path.join(uploadRoot, doc.storagePath);
  if (!fs.existsSync(absolute)) throw new ApiError(404, 'File missing on storage');

  await auditFromReq(req, {
    action: 'document.download',
    resourceType: 'ApplicationDocument',
    resourceId: doc._id,
    meta: { application: doc.application },
  });

  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);
  return fs.createReadStream(absolute).pipe(res);
});

const listApplicationDocuments = asyncHandler(async (req, res) => {
  const docs = await ApplicationDocument.find({
    application: req.params.id,
    isDeleted: false,
  }).sort({ createdAt: -1 });
  return success(res, docs, { count: docs.length });
});

function slugifyDocKey(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64) || 'requested_document';
}

/**
 * Admin requests one or more documents from the applicant.
 * Sets status → documents_required (when allowed) and creates pending requestedDocuments rows.
 */
const requestDocuments = asyncHandler(async (req, res) => {
  const { changeApplicationStatus, APPLICATION_STATUSES } = require('../../services/statusService');
  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found');

  const names = Array.isArray(req.body.documentNames)
    ? req.body.documentNames
    : req.body.documentName
      ? [req.body.documentName]
      : [];

  const cleaned = names.map((n) => String(n || '').trim()).filter(Boolean);
  if (!cleaned.length) {
    throw new ApiError(400, 'documentName or documentNames is required');
  }

  const note =
    req.body.note ||
    `Please upload: ${cleaned.join(', ')}`;

  const items = cleaned.map((name) => ({
    name,
    key: slugifyDocKey(name),
    status: 'pending',
    note: req.body.note || undefined,
    requestedAt: new Date(),
    requestedBy: req.staff._id,
  }));

  application.requestedDocuments = application.requestedDocuments || [];
  application.requestedDocuments.push(...items);
  application.documentRequestNote = note;

  const alreadyRequired = application.status === APPLICATION_STATUSES.DOCUMENTS_REQUIRED;

  if (!alreadyRequired) {
    await changeApplicationStatus({
      application,
      toStatus: APPLICATION_STATUSES.DOCUMENTS_REQUIRED,
      staff: req.staff,
      note,
      meta: { requestedDocuments: items.map((i) => ({ name: i.name, key: i.key })) },
    });
  } else {
    application.activity.push({
      action: 'document_requested',
      note,
      actorType: 'staff',
      actorId: req.staff._id,
      actorRole: req.staff.role,
      actorName: `${req.staff.firstName} ${req.staff.lastName}`,
      meta: { requestedDocuments: items.map((i) => ({ name: i.name, key: i.key })) },
      at: new Date(),
    });
    await application.save();

    if (application.applicant && application.personal?.email) {
      await notifyApplicant({
        applicantId: application.applicant,
        email: application.personal.email,
        type: 'document_request',
        title: `Documents requested for ${application.referenceId}`,
        body: note,
        applicationId: application._id,
        templateCode: 'application_status_change',
        vars: {
          referenceId: application.referenceId,
          status: application.status,
          note,
          fullName: application.personal.fullName || '',
        },
      });
    }
  }

  const fresh = await Application.findById(application._id)
    .populate('embassy', 'name code')
    .populate('assignedCaseManager', 'firstName lastName email')
    .lean();

  const documents = await ApplicationDocument.find({
    application: application._id,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  await auditFromReq(req, {
    action: 'document.request',
    resourceType: 'Application',
    resourceId: application._id,
    after: { requested: items.map((i) => i.name), status: fresh.status },
  });

  return success(res, {
    ...fresh,
    documents,
    allowedNextStatuses: require('../../config/statusWorkflow').getAllowedNextStatuses(fresh.status, {
      isReceptionist: req.staff.role === 'receptionist',
    }),
  });
});

module.exports = {
  deliverDocument,
  downloadDocument,
  listApplicationDocuments,
  requestDocuments,
};
