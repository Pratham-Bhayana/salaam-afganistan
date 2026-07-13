const VisaType = require('../models/VisaType');
const EligibilityRule = require('../models/EligibilityRule');
const DocumentRequirement = require('../models/DocumentRequirement');
const FormField = require('../models/FormField');
const FeeRule = require('../models/FeeRule');
const { ApiError, asyncHandler, success } = require('../middleware/error');

const listVisaTypes = asyncHandler(async (req, res) => {
  const { channel, includeInactive } = req.query;
  const filter = {};

  if (includeInactive !== 'true') filter.isActive = true;
  if (channel) filter.channel = channel;

  const data = await VisaType.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  return success(res, data, { count: data.length });
});

const getVisaTypeByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const visaType = await VisaType.findOne({ code }).lean();

  if (!visaType) {
    throw new ApiError(404, `Visa type not found: ${code}`);
  }

  const [eligibility, documents, formFields, fees] = await Promise.all([
    EligibilityRule.findOne({ visaTypeCode: code }).lean(),
    DocumentRequirement.find({ visaTypeCode: code }).sort({ sortOrder: 1 }).lean(),
    FormField.find({ visaTypeCode: code }).sort({ sortOrder: 1 }).lean(),
    FeeRule.find({ visaTypeCode: code, isActive: true }).lean(),
  ]);

  return success(res, {
    ...visaType,
    eligibility,
    documents,
    formFields,
    fees,
  });
});

const getDocuments = asyncHandler(async (req, res) => {
  const { code } = req.params;
  await assertVisaExists(code);
  const data = await DocumentRequirement.find({ visaTypeCode: code }).sort({ sortOrder: 1 }).lean();
  return success(res, data, { count: data.length });
});

const getFormFields = asyncHandler(async (req, res) => {
  const { code } = req.params;
  await assertVisaExists(code);
  const data = await FormField.find({ visaTypeCode: code }).sort({ sortOrder: 1 }).lean();
  return success(res, data, { count: data.length });
});

const getFees = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const { nationality, processing } = req.query;
  await assertVisaExists(code);

  const filter = { visaTypeCode: code, isActive: true };
  if (processing) filter.processing = processing;

  let data = await FeeRule.find(filter).lean();

  if (nationality) {
    const iso = String(nationality).toUpperCase();
    const specific = data.filter((f) => f.nationality === iso);
    const fallback = data.filter((f) => f.nationality === 'ALL');
    data = specific.length ? [...specific, ...fallback.filter((f) => !specific.some((s) => s.stage === f.stage && s.processing === f.processing))] : fallback;
  }

  return success(res, data, { count: data.length });
});

async function assertVisaExists(code) {
  const exists = await VisaType.exists({ code });
  if (!exists) throw new ApiError(404, `Visa type not found: ${code}`);
}

module.exports = {
  listVisaTypes,
  getVisaTypeByCode,
  getDocuments,
  getFormFields,
  getFees,
};
