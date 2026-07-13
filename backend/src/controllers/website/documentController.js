const path = require('path');
const fs = require('fs');
const ApplicationDocument = require('../../models/ApplicationDocument');
const IssuedVisa = require('../../models/IssuedVisa');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const { assertOwnApplication } = require('../../services/websiteAccessService');
const { APPLICATION_STATUSES } = require('../../config/statusWorkflow');
const { uploadRoot } = require('../../middleware/upload');

const uploadDocument = asyncHandler(async (req, res) => {
  const application = await assertOwnApplication(req, req.params.id);

  const canUpload =
    application.status === APPLICATION_STATUSES.DRAFT ||
    application.status === APPLICATION_STATUSES.DOCUMENTS_REQUIRED ||
    application.status === APPLICATION_STATUSES.PENDING;

  if (!canUpload) {
    throw new ApiError(400, `Uploads not allowed in status: ${application.status}`);
  }
  if (!req.file) throw new ApiError(400, 'File is required');
  if (!req.body.key) throw new ApiError(400, 'Document key is required');

  const storagePath = `applications/${req.file.filename}`;
  const doc = await ApplicationDocument.create({
    application: application._id,
    key: req.body.key,
    label: req.body.label || req.body.key,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storageProvider: 'local',
    storagePath,
    uploadedByType: 'applicant',
    uploadedBy: req.applicant._id,
    category: 'applicant_upload',
    visibleToApplicant: true,
  });

  application.activity.push({
    action: 'document_uploaded',
    note: `Uploaded ${doc.label}`,
    actorType: 'applicant',
    actorId: req.applicant._id,
    actorName: application.personal?.fullName || 'Applicant',
    meta: { documentId: doc._id, key: doc.key },
    at: new Date(),
  });

  // Mark matching admin document requests as uploaded
  if (Array.isArray(application.requestedDocuments)) {
    for (const reqDoc of application.requestedDocuments) {
      if (
        reqDoc.status === 'pending' &&
        (reqDoc.key === doc.key || reqDoc.name?.toLowerCase() === String(doc.label).toLowerCase())
      ) {
        reqDoc.status = 'uploaded';
        reqDoc.fulfilledAt = new Date();
        reqDoc.fulfilledDocument = doc._id;
      }
    }
  }

  await application.save();
  return success(res, doc, null, 201);
});

const listDocuments = asyncHandler(async (req, res) => {
  await assertOwnApplication(req, req.params.id);
  const docs = await ApplicationDocument.find({
    application: req.params.id,
    isDeleted: false,
    visibleToApplicant: true,
  }).sort({ createdAt: -1 });
  return success(res, docs, { count: docs.length });
});

const downloadDocument = asyncHandler(async (req, res) => {
  await assertOwnApplication(req, req.params.id);
  const doc = await ApplicationDocument.findOne({
    _id: req.params.documentId,
    application: req.params.id,
    isDeleted: false,
    visibleToApplicant: true,
  });
  if (!doc) throw new ApiError(404, 'Document not found');

  const absolute = path.join(uploadRoot, doc.storagePath);
  if (!fs.existsSync(absolute)) throw new ApiError(404, 'File missing on storage');

  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${doc.originalName}"`);
  return fs.createReadStream(absolute).pipe(res);
});

const downloadIssuedVisa = asyncHandler(async (req, res) => {
  const application = await assertOwnApplication(req, req.params.id);
  const visa = await IssuedVisa.findOne({ application: application._id });
  if (!visa) throw new ApiError(404, 'Issued visa not available yet');

  const absolute = path.join(uploadRoot, visa.storagePath);
  if (!fs.existsSync(absolute)) throw new ApiError(404, 'Visa PDF missing on storage');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${visa.visaNumber}.pdf"`);
  return fs.createReadStream(absolute).pipe(res);
});

module.exports = {
  uploadDocument,
  listDocuments,
  downloadDocument,
  downloadIssuedVisa,
};
