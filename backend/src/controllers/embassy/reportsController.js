const Application = require('../../models/Application');
const Payment = require('../../models/Payment');
const EmbassyActivityLog = require('../../models/EmbassyActivityLog');
const EmbassyStaff = require('../../models/EmbassyStaff');
const { asyncHandler, success } = require('../../middleware/error');
const { parsePagination, buildDateRangeFilter } = require('../../utils/helpers');
const { APPLICATION_STATUSES } = require('../../config/statusWorkflow');

const ACTIVE_INBOX_STATUSES = [
  APPLICATION_STATUSES.SENT_TO_EMBASSY,
  APPLICATION_STATUSES.UNDER_EMBASSY_REVIEW,
  APPLICATION_STATUSES.DOCUMENTS_REQUIRED,
];

function previousPeriodRange(query) {
  const now = new Date();
  if (query.from && query.to) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const span = to.getTime() - from.getTime();
    if (Number.isFinite(span) && span > 0) {
      return {
        from: new Date(from.getTime() - span),
        to: from,
      };
    }
  }
  if (query.period === 'monthly') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { from: start, to: end };
  }
  if (query.period === 'quarterly') {
    const q = Math.floor(now.getUTCMonth() / 3) * 3;
    const start = new Date(Date.UTC(now.getUTCFullYear(), q - 3, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), q, 1));
    return { from: start, to: end };
  }
  if (query.period === 'yearly') {
    return {
      from: new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)),
      to: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
    };
  }
  return null;
}

async function countByStatuses(embassyId, statuses) {
  return Application.countDocuments({
    embassy: embassyId,
    isArchived: false,
    status: { $in: statuses },
  });
}

const dashboard = asyncHandler(async (req, res) => {
  const embassyId = req.embassyId;
  const dateFilter = buildDateRangeFilter(req.query, req.query.dateField || 'updatedAt');
  const match = { embassy: embassyId, isArchived: false, ...dateFilter };
  const prev = previousPeriodRange(req.query);

  const monthStart = new Date();
  monthStart.setUTCMonth(monthStart.getUTCMonth() - 6, 1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [
    byStatus,
    byVisaType,
    totals,
    turnaround,
    activeInbox,
    underReview,
    approvedInPeriod,
    prevApproved,
    prevTurnaround,
    receivedTrend,
    decidedTrend,
    staffAgg,
  ] = await Promise.all([
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
          embassy: embassyId,
          sentToEmbassyAt: { $exists: true, $ne: null },
          decidedAt: { $exists: true, $ne: null },
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
    countByStatuses(embassyId, ACTIVE_INBOX_STATUSES),
    countByStatuses(embassyId, [APPLICATION_STATUSES.UNDER_EMBASSY_REVIEW]),
    Application.countDocuments({
      embassy: embassyId,
      isArchived: false,
      status: { $in: [APPLICATION_STATUSES.APPROVED, APPLICATION_STATUSES.VISA_ISSUED] },
      ...buildDateRangeFilter(req.query, 'decidedAt'),
    }),
    prev
      ? Application.countDocuments({
          embassy: embassyId,
          isArchived: false,
          status: { $in: [APPLICATION_STATUSES.APPROVED, APPLICATION_STATUSES.VISA_ISSUED] },
          decidedAt: { $gte: prev.from, $lte: prev.to },
        })
      : Promise.resolve(null),
    prev
      ? Application.aggregate([
          {
            $match: {
              embassy: embassyId,
              sentToEmbassyAt: { $exists: true, $ne: null },
              decidedAt: { $gte: prev.from, $lte: prev.to },
            },
          },
          {
            $project: {
              turnaroundHours: {
                $divide: [{ $subtract: ['$decidedAt', '$sentToEmbassyAt'] }, 1000 * 60 * 60],
              },
            },
          },
          { $group: { _id: null, avgHours: { $avg: '$turnaroundHours' } } },
        ])
      : Promise.resolve([]),
    Application.aggregate([
      {
        $match: {
          embassy: embassyId,
          sentToEmbassyAt: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$sentToEmbassyAt' },
            month: { $month: '$sentToEmbassyAt' },
          },
          received: { $sum: 1 },
        },
      },
    ]),
    Application.aggregate([
      {
        $match: {
          embassy: embassyId,
          decidedAt: { $gte: monthStart },
          status: {
            $in: [
              APPLICATION_STATUSES.APPROVED,
              APPLICATION_STATUSES.VISA_ISSUED,
              APPLICATION_STATUSES.REJECTED,
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$decidedAt' },
            month: { $month: '$decidedAt' },
          },
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
          embassy: embassyId,
          isArchived: false,
          status: { $in: ACTIVE_INBOX_STATUSES },
          assignedEmbassyStaff: { $ne: null },
        },
      },
      { $group: { _id: '$assignedEmbassyStaff', cases: { $sum: 1 } } },
      { $sort: { cases: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const summary = totals[0] || { total: 0, approved: 0, rejected: 0 };
  const approvalRate =
    summary.total > 0 ? Number(((summary.approved / summary.total) * 100).toFixed(2)) : 0;
  const rejectionRate =
    summary.total > 0 ? Number(((summary.rejected / summary.total) * 100).toFixed(2)) : 0;
  const turnaroundRow = turnaround[0] || {
    avgHours: 0,
    minHours: 0,
    maxHours: 0,
    sampleSize: 0,
  };
  const prevAvgHours = prevTurnaround[0]?.avgHours ?? null;

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const trendMap = new Map();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - i, 1);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    trendMap.set(key, {
      month: monthNames[d.getUTCMonth()],
      year: d.getUTCFullYear(),
      received: 0,
      approved: 0,
      rejected: 0,
    });
  }
  for (const row of receivedTrend) {
    const key = `${row._id.year}-${row._id.month}`;
    if (trendMap.has(key)) trendMap.get(key).received = row.received;
  }
  for (const row of decidedTrend) {
    const key = `${row._id.year}-${row._id.month}`;
    if (trendMap.has(key)) {
      trendMap.get(key).approved = row.approved;
      trendMap.get(key).rejected = row.rejected;
    }
  }

  const staffIds = staffAgg.map((s) => s._id).filter(Boolean);
  const staffDocs = staffIds.length
    ? await EmbassyStaff.find({ _id: { $in: staffIds } })
        .select('firstName lastName email')
        .lean()
    : [];
  const staffById = new Map(staffDocs.map((s) => [String(s._id), s]));
  const staffLoad = staffAgg.map((row) => {
    const s = staffById.get(String(row._id));
    const full = s
      ? `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email || 'Staff'
      : 'Staff';
    return {
      staffId: row._id,
      name: full.split(' ')[0] || full,
      cases: row.cases,
    };
  });

  const fmtDelta = (current, previous) => {
    if (previous == null) return { delta: '—', trend: 'flat' };
    const diff = current - previous;
    if (diff === 0) return { delta: '0', trend: 'flat' };
    return {
      delta: diff > 0 ? `+${diff}` : String(diff),
      trend: diff > 0 ? 'up' : 'down',
    };
  };

  const approvedDelta = fmtDelta(approvedInPeriod, prevApproved);
  const turnaroundDays =
    turnaroundRow.sampleSize > 0 ? Number((turnaroundRow.avgHours / 24).toFixed(1)) : null;
  const prevTurnaroundDays =
    prevAvgHours != null ? Number((prevAvgHours / 24).toFixed(1)) : null;
  let turnaroundDelta = { delta: '—', trend: 'flat' };
  if (turnaroundDays != null && prevTurnaroundDays != null) {
    const diff = Number((turnaroundDays - prevTurnaroundDays).toFixed(1));
    turnaroundDelta = {
      delta: diff === 0 ? '0d' : `${diff > 0 ? '+' : ''}${diff}d`,
      trend: diff === 0 ? 'flat' : diff < 0 ? 'down' : 'up',
    };
  }

  return success(res, {
    kpis: {
      activeInbox,
      underReview,
      approvedInPeriod,
      avgTurnaroundDays: turnaroundDays,
      activeInboxDelta: {
        delta: activeInbox > 0 ? String(activeInbox) : '0',
        trend: activeInbox > 0 ? 'up' : 'flat',
      },
      underReviewDelta: {
        delta: underReview > 0 ? String(underReview) : '0',
        trend: underReview > 0 ? 'up' : 'flat',
      },
      approvedDelta,
      turnaroundDelta,
    },
    summary: { ...summary, approvalRate, rejectionRate },
    byStatus,
    byVisaType,
    turnaround: turnaroundRow,
    monthlyTrend: Array.from(trendMap.values()),
    staffLoad,
  });
});

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
  dashboard,
  reports,
  paymentSummary,
  activityLogs,
};
