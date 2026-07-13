const IssuedVisa = require('../../models/IssuedVisa');
const VisaTemplate = require('../../models/VisaTemplate');
const path = require('path');
const fs = require('fs');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const {
  parsePagination,
  escapeRegex,
  buildDateRangeFilter,
  toCsv,
} = require('../../utils/helpers');
const { uploadRoot } = require('../../middleware/upload');
const { issueVisaForApplication } = require('../../services/visaGenerationService');
const { auditFromReq } = require('../../services/auditService');

const listIssued = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { ...buildDateRangeFilter(req.query, 'issuedAt') };
  if (req.query.visaTypeCode) filter.visaTypeCode = req.query.visaTypeCode;
  if (req.query.embassy) filter.embassy = req.query.embassy;
  if (req.query.q) {
    const q = escapeRegex(req.query.q);
    filter.$or = [
      { visaNumber: new RegExp(q, 'i') },
      { referenceId: new RegExp(q, 'i') },
      { applicantName: new RegExp(q, 'i') },
      { passportNumber: new RegExp(q, 'i') },
    ];
  }

  const [data, total] = await Promise.all([
    IssuedVisa.find(filter)
      .populate('embassy', 'name code')
      .populate('template', 'code name')
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(limit),
    IssuedVisa.countDocuments(filter),
  ]);

  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getIssued = asyncHandler(async (req, res) => {
  const visa = await IssuedVisa.findById(req.params.id)
    .populate('application')
    .populate('embassy')
    .populate('template');
  if (!visa) throw new ApiError(404, 'Issued visa not found');
  return success(res, visa);
});

const issueNow = asyncHandler(async (req, res) => {
  const issued = await issueVisaForApplication({
    applicationId: req.body.applicationId,
    staff: req.staff,
    force: !!req.body.force,
  });
  await auditFromReq(req, {
    action: 'visa.issue',
    resourceType: 'IssuedVisa',
    resourceId: issued._id,
    after: issued.toObject(),
  });
  return success(res, issued, null, 201);
});

const downloadIssued = asyncHandler(async (req, res) => {
  const visa = await IssuedVisa.findById(req.params.id);
  if (!visa) throw new ApiError(404, 'Issued visa not found');
  const absolute = path.join(uploadRoot, visa.storagePath);
  if (!fs.existsSync(absolute)) throw new ApiError(404, 'Visa PDF missing on storage');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${visa.visaNumber}.pdf"`);
  return fs.createReadStream(absolute).pipe(res);
});

const exportIssuedCsv = asyncHandler(async (req, res) => {
  const filter = { ...buildDateRangeFilter(req.query, 'issuedAt') };
  const rows = await IssuedVisa.find(filter).sort({ issuedAt: -1 }).limit(5000).lean();
  const csv = toCsv(rows, [
    { label: 'visaNumber', value: 'visaNumber' },
    { label: 'referenceId', value: 'referenceId' },
    { label: 'applicantName', value: 'applicantName' },
    { label: 'nationality', value: 'nationality' },
    { label: 'visaTypeCode', value: 'visaTypeCode' },
    { label: 'validFrom', value: (r) => new Date(r.validFrom).toISOString() },
    { label: 'validUntil', value: (r) => new Date(r.validUntil).toISOString() },
    { label: 'issuedAt', value: (r) => new Date(r.issuedAt).toISOString() },
  ]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="issued-visas.csv"');
  return res.status(200).send(csv);
});

const listTemplates = asyncHandler(async (_req, res) => {
  const data = await VisaTemplate.find().sort({ isDefault: -1, name: 1 });
  return success(res, data, { count: data.length });
});

const upsertTemplate = asyncHandler(async (req, res) => {
  if (req.body.isDefault) {
    await VisaTemplate.updateMany({}, { $set: { isDefault: false } });
  }
  const doc = await VisaTemplate.findOneAndUpdate(
    { code: req.body.code },
    { $set: { ...req.body, updatedBy: req.staff._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
  return success(res, doc);
});

const getTemplate = asyncHandler(async (req, res) => {
  const doc = await VisaTemplate.findById(req.params.id);
  if (!doc) throw new ApiError(404, 'Template not found');
  return success(res, doc);
});

module.exports = {
  listIssued,
  getIssued,
  issueNow,
  downloadIssued,
  exportIssuedCsv,
  listTemplates,
  upsertTemplate,
  getTemplate,
};
