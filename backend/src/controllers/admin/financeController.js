const Payment = require('../../models/Payment');
const Application = require('../../models/Application');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const {
  parsePagination,
  generateReferenceId,
  buildDateRangeFilter,
  toCsv,
} = require('../../utils/helpers');
const { auditFromReq } = require('../../services/auditService');

const listPayments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.visaTypeCode) filter.visaTypeCode = req.query.visaTypeCode;
  if (req.query.embassy) filter.embassy = req.query.embassy;
  if (req.query.application) filter.application = req.query.application;
  Object.assign(filter, buildDateRangeFilter(req.query, req.query.dateField || 'createdAt'));

  const [data, total] = await Promise.all([
    Payment.find(filter)
      .populate('application', 'referenceId personal.fullName status')
      .populate('embassy', 'name code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);

  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const recordPayment = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.body.applicationId);
  if (!application) throw new ApiError(404, 'Application not found');

  const payment = await Payment.create({
    application: application._id,
    referenceId: generateReferenceId('PAY'),
    provider: req.body.provider || 'manual',
    providerPaymentId: req.body.providerPaymentId,
    stage: req.body.stage || 'flat',
    currency: (req.body.currency || 'USD').toUpperCase(),
    amount: req.body.amount,
    status: req.body.status || 'successful',
    visaTypeCode: application.visaTypeCode,
    embassy: application.embassy,
    nationality: application.personal?.nationality,
    processing: application.travel?.processingSpeed || 'standard',
    paidAt: req.body.status === 'failed' ? undefined : new Date(),
    failureReason: req.body.failureReason,
    recordedBy: req.staff._id,
    notes: req.body.notes,
  });

  if (payment.status === 'successful') {
    application.paymentStatus = 'paid';
  } else if (payment.status === 'failed') {
    application.paymentStatus = 'failed';
  } else if (payment.status === 'refunded') {
    application.paymentStatus = 'refunded';
  } else {
    application.paymentStatus = 'pending';
  }
  await application.save();

  await auditFromReq(req, {
    action: 'payment.record',
    resourceType: 'Payment',
    resourceId: payment._id,
    after: payment.toObject(),
  });

  return success(res, payment, null, 201);
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, 'Payment not found');

  const before = payment.toObject();
  payment.status = req.body.status;
  if (req.body.status === 'successful') payment.paidAt = new Date();
  if (req.body.status === 'refunded') payment.refundedAt = new Date();
  if (req.body.failureReason) payment.failureReason = req.body.failureReason;
  if (req.body.notes) payment.notes = req.body.notes;
  await payment.save();

  const application = await Application.findById(payment.application);
  if (application) {
    application.paymentStatus =
      req.body.status === 'successful'
        ? 'paid'
        : req.body.status === 'refunded'
          ? 'refunded'
          : req.body.status === 'failed'
            ? 'failed'
            : application.paymentStatus;
    await application.save();
  }

  await auditFromReq(req, {
    action: 'payment.update_status',
    resourceType: 'Payment',
    resourceId: payment._id,
    before,
    after: payment.toObject(),
  });

  return success(res, payment);
});

const revenueDashboard = asyncHandler(async (req, res) => {
  const match = { status: 'successful' };
  Object.assign(match, buildDateRangeFilter(req.query, 'paidAt'));
  if (req.query.visaTypeCode) match.visaTypeCode = req.query.visaTypeCode;
  if (req.query.embassy) match.embassy = req.query.embassy;

  const [byVisaType, byEmbassy, byDay, totals] = await Promise.all([
    Payment.aggregate([
      { $match: match },
      { $group: { _id: '$visaTypeCode', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Payment.aggregate([
      { $match: match },
      { $group: { _id: '$embassy', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          count: { $sum: 1 },
          avgTicket: { $avg: '$amount' },
        },
      },
    ]),
  ]);

  const reconciliation = await Payment.aggregate([
    { $match: { ...buildDateRangeFilter(req.query, 'createdAt') } },
    { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
  ]);

  return success(res, {
    totals: totals[0] || { totalRevenue: 0, count: 0, avgTicket: 0 },
    byVisaType,
    byEmbassy,
    byDay,
    reconciliation,
  });
});

const exportPaymentsCsv = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  Object.assign(filter, buildDateRangeFilter(req.query, req.query.dateField || 'createdAt'));

  const rows = await Payment.find(filter).sort({ createdAt: -1 }).limit(5000).lean();
  const csv = toCsv(rows, [
    { label: 'referenceId', value: 'referenceId' },
    { label: 'status', value: 'status' },
    { label: 'amount', value: 'amount' },
    { label: 'currency', value: 'currency' },
    { label: 'visaTypeCode', value: 'visaTypeCode' },
    { label: 'nationality', value: 'nationality' },
    { label: 'paidAt', value: (r) => (r.paidAt ? new Date(r.paidAt).toISOString() : '') },
    { label: 'createdAt', value: (r) => new Date(r.createdAt).toISOString() },
  ]);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="payments-export.csv"');
  return res.status(200).send(csv);
});

module.exports = {
  listPayments,
  recordPayment,
  updatePaymentStatus,
  revenueDashboard,
  exportPaymentsCsv,
};
