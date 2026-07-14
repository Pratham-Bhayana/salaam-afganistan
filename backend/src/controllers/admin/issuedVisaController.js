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
const {
  issueVisaForApplication,
  previewVisaForApplication,
} = require('../../services/visaGenerationService');
const { auditFromReq } = require('../../services/auditService');
const {
  EVISA_TEMPLATE_CODE,
  VISA_TYPE_KEYS,
  cloneFields,
  buildDefaultFieldsByVisaType,
} = require('../../services/evisaTemplateConfig');

function normalizeFieldList(list) {
  if (!Array.isArray(list)) return cloneFields();
  return list
    .filter((f) => f && f.key && f.label)
    .map((f, i) => ({
      key: String(f.key),
      label: String(f.label),
      x: Number(f.x) || 72,
      y: Number(f.y) || 200 + i * 18,
      width: f.width,
      height: f.height,
      fontSize: Number(f.fontSize) || 11,
      align: f.align === 'center' || f.align === 'right' ? f.align : 'left',
    }));
}

function normalizeFieldsByVisaType(raw, fallbackPlaceholders) {
  const base = buildDefaultFieldsByVisaType();
  const src =
    raw instanceof Map
      ? Object.fromEntries(raw.entries())
      : raw && typeof raw === 'object'
        ? raw
        : {};

  const out = {};
  for (const key of VISA_TYPE_KEYS) {
    if (Array.isArray(src[key]) && src[key].length) {
      out[key] = normalizeFieldList(src[key]);
    } else if (Array.isArray(fallbackPlaceholders) && fallbackPlaceholders.length && key === 'tourist') {
      out[key] = normalizeFieldList(fallbackPlaceholders);
    } else {
      out[key] = base[key];
    }
  }
  return out;
}

function normalizeTemplatePayload(body = {}) {
  const layoutIn = body.layout || {};
  const placeholders = normalizeFieldList(body.placeholders);
  const fieldsByVisaType = normalizeFieldsByVisaType(body.fieldsByVisaType, placeholders);

  // Keep placeholders in sync with currently edited type (tourist by default)
  const activeType = VISA_TYPE_KEYS.includes(body.activeVisaType) ? body.activeVisaType : 'tourist';
  const activeFields = fieldsByVisaType[activeType] || placeholders;

  return {
    code: body.code || EVISA_TEMPLATE_CODE,
    name: body.name || 'Salaam eVISA Template',
    description: body.description,
    pageWidth: body.pageWidth || 595,
    pageHeight: body.pageHeight || 842,
    backgroundImageUrl: body.backgroundImageUrl,
    placeholders: activeFields,
    fieldsByVisaType,
    layout: {
      govLine: layoutIn.govLine || 'ISLAMIC EMIRATE OF AFGHANISTAN',
      ministryLine: layoutIn.ministryLine || 'Ministry of Foreign Affairs',
      systemLine: layoutIn.systemLine || 'Salaam Afghanistan — Electronic Visa System',
      sectionTitle: layoutIn.sectionTitle || 'eVISA Holder Information',
      accentColor: layoutIn.accentColor || '#1B4D45',
      fontSize: Number(layoutIn.fontSize) || 11,
      salaamLogoUrl: layoutIn.salaamLogoUrl || body.logoImageUrl || '/Logo.png',
      embassyLogoUrl: layoutIn.embassyLogoUrl || body.sealImageUrl || '/taliban-flag.png',
      disclaimer:
        layoutIn.disclaimer ||
        'This electronic visa authorizes travel to Afghanistan but does not guarantee entry.',
      showPhoto: layoutIn.showPhoto !== false,
      showPageNumbers: Boolean(layoutIn.showPageNumbers),
    },
    includeQr: body.includeQr !== false,
    includeBarcode: body.includeBarcode !== false,
    sealImageUrl: body.sealImageUrl || layoutIn.embassyLogoUrl || '/taliban-flag.png',
    logoImageUrl: body.logoImageUrl || layoutIn.salaamLogoUrl || '/Logo.png',
    isDefault: body.isDefault !== false,
    isActive: body.isActive !== false,
  };
}

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

const previewVisa = asyncHandler(async (req, res) => {
  if (!req.body.applicationId) throw new ApiError(400, 'applicationId is required');

  const preview = await previewVisaForApplication({
    applicationId: req.body.applicationId,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${preview.fileName}"`);
  res.setHeader('X-Visa-Preview-Number', preview.visaNumber);
  res.setHeader('X-Visa-Reference-Id', preview.referenceId || '');
  res.setHeader('X-Applicant-Email', preview.applicantEmail || '');
  res.setHeader('X-Applicant-Name', encodeURIComponent(preview.applicantName || ''));
  return res.status(200).send(preview.buffer);
});

const issueNow = asyncHandler(async (req, res) => {
  if (!req.body.applicationId) throw new ApiError(400, 'applicationId is required');

  const sendEmail = req.body.sendEmail !== false && req.body.sendEmail !== 'false';
  const issued = await issueVisaForApplication({
    applicationId: req.body.applicationId,
    staff: req.staff,
    force: !!req.body.force,
    sendEmail,
  });
  await auditFromReq(req, {
    action: 'visa.issue',
    resourceType: 'IssuedVisa',
    resourceId: issued._id,
    after: issued.toObject(),
    meta: { sendEmail },
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
  const data = await VisaTemplate.find({ isActive: true }).sort({ isDefault: -1, name: 1 });
  return success(res, data, { count: data.length });
});

const upsertTemplate = asyncHandler(async (req, res) => {
  const payload = normalizeTemplatePayload(req.body);

  // Single-template product rule: this becomes the only default/active sheet
  await VisaTemplate.updateMany(
    { code: { $ne: payload.code } },
    { $set: { isDefault: false, isActive: false } }
  );

  const doc = await VisaTemplate.findOneAndUpdate(
    { code: payload.code },
    {
      $set: {
        ...payload,
        updatedBy: req.staff._id,
        isDefault: true,
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  await auditFromReq(req, {
    action: 'visa_template.upsert',
    resourceType: 'VisaTemplate',
    resourceId: doc._id,
    meta: { code: doc.code },
  });

  return success(res, doc);
});

const getTemplate = asyncHandler(async (req, res) => {
  let doc = null;
  if (req.params.id === 'default' || req.params.id === EVISA_TEMPLATE_CODE) {
    doc = await VisaTemplate.findOne({ code: EVISA_TEMPLATE_CODE, isActive: true });
    if (!doc) doc = await VisaTemplate.findOne({ isDefault: true, isActive: true });
  } else {
    doc = await VisaTemplate.findById(req.params.id);
  }
  if (!doc) throw new ApiError(404, 'Template not found');
  return success(res, doc);
});

module.exports = {
  listIssued,
  getIssued,
  previewVisa,
  issueNow,
  downloadIssued,
  exportIssuedCsv,
  listTemplates,
  upsertTemplate,
  getTemplate,
};
