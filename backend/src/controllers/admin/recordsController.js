const { asyncHandler, success } = require('../../middleware/error');
const {
  listDecisionRecords,
  exportDecisionRecords,
} = require('../../services/decisionRecordsService');
const { escapeRegex, toCsv, buildDateRangeFilter } = require('../../utils/helpers');
const Application = require('../../models/Application');
const { ApiError } = require('../../middleware/error');
const { buildApplicationFilter } = require('./applicationController');

const lookup = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) throw new ApiError(400, 'Query q is required (reference ID, name, email, or passport)');

  const rx = new RegExp(escapeRegex(q), 'i');
  const data = await Application.find({
    $or: [
      { referenceId: rx },
      { 'personal.fullName': rx },
      { 'personal.email': rx },
      { 'personal.phone': rx },
      { 'passport.passportNumber': rx },
    ],
  })
    .select('referenceId status visaTypeCode personal passport paymentStatus createdAt source')
    .sort({ createdAt: -1 })
    .limit(20);

  return success(res, data, { count: data.length });
});

/** Decision-only records: approved / rejected / visa_issued */
const listDecisions = asyncHandler(async (req, res) => {
  const { data, meta } = await listDecisionRecords(req.query, { embassyOnly: false });
  return success(res, data, meta);
});

const exportDecisions = asyncHandler(async (req, res) => {
  const csv = await exportDecisionRecords(req.query, { embassyOnly: false });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="decision-records.csv"');
  return res.status(200).send(csv);
});

/** Legacy broad export kept for backwards compatibility */
const exportRecords = asyncHandler(async (req, res) => {
  const filter = buildApplicationFilter(req.query);
  const rows = await Application.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

  const csv = toCsv(rows, [
    { label: 'referenceId', value: 'referenceId' },
    { label: 'status', value: 'status' },
    { label: 'visaTypeCode', value: 'visaTypeCode' },
    { label: 'channel', value: 'channel' },
    { label: 'fullName', value: (r) => r.personal?.fullName || '' },
    { label: 'email', value: (r) => r.personal?.email || '' },
    { label: 'nationality', value: (r) => r.personal?.nationality || '' },
    { label: 'paymentStatus', value: 'paymentStatus' },
    { label: 'embassy', value: (r) => r.embassy || '' },
    { label: 'createdAt', value: (r) => new Date(r.createdAt).toISOString() },
    { label: 'submittedAt', value: (r) => (r.submittedAt ? new Date(r.submittedAt).toISOString() : '') },
  ]);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="applications-export.csv"');
  return res.status(200).send(csv);
});

const recordsSummary = asyncHandler(async (req, res) => {
  const match = { ...buildDateRangeFilter(req.query, 'createdAt') };
  if (req.query.embassy) match.embassy = req.query.embassy;
  if (req.query.visaTypeCode) match.visaTypeCode = req.query.visaTypeCode;

  const [byStatus, byVisaType, total] = await Promise.all([
    Application.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      { $match: match },
      { $group: { _id: '$visaTypeCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.countDocuments(match),
  ]);

  return success(res, { total, byStatus, byVisaType });
});

module.exports = {
  lookup,
  listDecisions,
  exportDecisions,
  exportRecords,
  recordsSummary,
};
