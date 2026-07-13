const Application = require('../../models/Application');
const Payment = require('../../models/Payment');
const EmbassyActivityLog = require('../../models/EmbassyActivityLog');
const { asyncHandler, success } = require('../../middleware/error');
const { parsePagination, buildDateRangeFilter } = require('../../utils/helpers');
const { APPLICATION_STATUSES } = require('../../config/statusWorkflow');

const reports = asyncHandler(async (req, res) => {
  const match = {
    embassy: req.embassyId,
    ...buildDateRangeFilter(req.query, req.query.dateField || 'updatedAt'),
  };

  const [byStatus, byVisaType, totals, turnaround] = await Promise.all([
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
    Application.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    [APPLICATION_STATUSES.APPROVED, APPLICATION_STATUSES.VISA_ISSUED],
                  ],
                },
                1,
                0,
              ],
            },
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ['$status', APPLICATION_STATUSES.REJECTED] }, 1, 0],
            },
          },
        },
      },
    ]),
    Application.aggregate([
      {
        $match: {
          embassy: req.embassyId,
          sentToEmbassyAt: { $exists: true },
          decidedAt: { $exists: true },
          ...buildDateRangeFilter(req.query, 'decidedAt'),
        },
      },
      {
        $project: {
          turnaroundHours: {
            $divide: [{ $subtract: ['$decidedAt', '$sentToEmbassyAt'] }, 1000 * 60 * 60],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$turnaroundHours' },
          minHours: { $min: '$turnaroundHours' },
          maxHours: { $max: '$turnaroundHours' },
          sampleSize: { $sum: 1 },
        },
      },
    ]),
  ]);

  const summary = totals[0] || { total: 0, approved: 0, rejected: 0 };
  const approvalRate =
    summary.total > 0 ? Number(((summary.approved / summary.total) * 100).toFixed(2)) : 0;
  const rejectionRate =
    summary.total > 0 ? Number(((summary.rejected / summary.total) * 100).toFixed(2)) : 0;

  return success(res, {
    summary: { ...summary, approvalRate, rejectionRate },
    byStatus,
    byVisaType,
    turnaround: turnaround[0] || { avgHours: 0, minHours: 0, maxHours: 0, sampleSize: 0 },
  });
});

const paymentSummary = asyncHandler(async (req, res) => {
  const match = {
    embassy: req.embassyId,
    status: 'successful',
    ...buildDateRangeFilter(req.query, 'paidAt'),
  };

  const [totals, byVisaType] = await Promise.all([
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
    Payment.aggregate([
      { $match: match },
      { $group: { _id: '$visaTypeCode', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  return success(res, {
    totals: totals[0] || { totalRevenue: 0, count: 0, avgTicket: 0 },
    byVisaType,
  });
});

const activityLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { embassy: req.embassyId };
  if (req.query.action) filter.action = req.query.action;
  if (req.query.embassyStaff) filter.embassyStaff = req.query.embassyStaff;
  if (req.query.application) filter.application = req.query.application;

  const [data, total] = await Promise.all([
    EmbassyActivityLog.find(filter)
      .populate('embassyStaff', 'firstName lastName email role')
      .populate('application', 'referenceId status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    EmbassyActivityLog.countDocuments(filter),
  ]);

  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

module.exports = {
  reports,
  paymentSummary,
  activityLogs,
};
