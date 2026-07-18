const Application = require('../../models/Application');
const Payment = require('../../models/Payment');
const Embassy = require('../../models/Embassy');
const { asyncHandler, success } = require('../../middleware/error');
const { buildDateRangeFilter } = require('../../utils/helpers');
const { APPLICATION_STATUSES } = require('../../config/statusWorkflow');

const PENDING_STATUSES = [
  APPLICATION_STATUSES.PENDING,
  APPLICATION_STATUSES.DOCUMENTS_REQUIRED,
];

function previousPeriodRange(query) {
  const now = new Date();
  if (query.from && query.to) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const span = to.getTime() - from.getTime();
    if (Number.isFinite(span) && span > 0) {
      return { from: new Date(from.getTime() - span), to: from };
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

function pctDelta(current, previous) {
  if (previous == null) return { delta: '—', trend: 'flat' };
  if (previous === 0) {
    if (current === 0) return { delta: '0%', trend: 'flat' };
    return { delta: '+100%', trend: 'up' };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    delta: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
    trend: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
  };
}

function countByStatuses(statuses, extra = {}) {
  return Application.countDocuments({
    isArchived: false,
    status: { $in: statuses },
    ...extra,
  });
}

const dashboard = asyncHandler(async (req, res) => {
  const periodFilter = buildDateRangeFilter(req.query, req.query.dateField || 'createdAt');
  const prev = previousPeriodRange(req.query);

  const monthStart = new Date();
  monthStart.setUTCMonth(monthStart.getUTCMonth() - 6, 1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const revenuePeriodFilter = buildDateRangeFilter(req.query, 'paidAt');
  const revenueMatch = { status: 'successful', ...revenuePeriodFilter };

  const [
    totalInPeriod,
    prevTotalInPeriod,
    pendingReview,
    atEmbassy,
    embassyCount,
    byStatus,
    byVisaType,
    byEmbassyAgg,
    applicationsTrend,
    issuedTrend,
    revenueTotals,
    prevRevenueTotals,
    revenueByMonth,
  ] = await Promise.all([
    Application.countDocuments({ isArchived: false, ...periodFilter }),
    prev
      ? Application.countDocuments({
          isArchived: false,
          createdAt: { $gte: prev.from, $lte: prev.to },
        })
      : Promise.resolve(null),
    countByStatuses(PENDING_STATUSES),
    countByStatuses([
      APPLICATION_STATUSES.SENT_TO_EMBASSY,
      APPLICATION_STATUSES.UNDER_EMBASSY_REVIEW,
    ]),
    Embassy.countDocuments({ isActive: true }),
    Application.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      { $match: { isArchived: false, ...periodFilter } },
      { $group: { _id: '$visaTypeCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      {
        $match: {
          isArchived: false,
          embassy: { $ne: null },
          ...periodFilter,
        },
      },
      { $group: { _id: '$embassy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Application.aggregate([
      { $match: { isArchived: false, createdAt: { $gte: monthStart } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          applications: { $sum: 1 },
        },
      },
    ]),
    Application.aggregate([
      {
        $match: {
          isArchived: false,
          status: APPLICATION_STATUSES.VISA_ISSUED,
          issuedAt: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$issuedAt' }, month: { $month: '$issuedAt' } },
          issued: { $sum: 1 },
        },
      },
    ]),
    Payment.aggregate([
      { $match: revenueMatch },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    prev
      ? Payment.aggregate([
          {
            $match: {
              status: 'successful',
              paidAt: { $gte: prev.from, $lte: prev.to },
            },
          },
          { $group: { _id: null, totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
    Payment.aggregate([
      { $match: { status: 'successful', paidAt: { $gte: monthStart } } },
      {
        $group: {
          _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
          revenue: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const embassyIds = byEmbassyAgg.map((r) => r._id).filter(Boolean);
  const embassies = embassyIds.length
    ? await Embassy.find({ _id: { $in: embassyIds } }).select('name code').lean()
    : [];
  const embassyById = new Map(embassies.map((e) => [String(e._id), e]));
  const byEmbassy = byEmbassyAgg.map((row) => {
    const e = embassyById.get(String(row._id));
    return {
      embassy: e?.name || e?.code || 'Unassigned',
      code: e?.code || '',
      count: row.count,
    };
  });

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const trendMap = new Map();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - i, 1);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
    trendMap.set(key, {
      month: monthNames[d.getUTCMonth()],
      year: d.getUTCFullYear(),
      applications: 0,
      issued: 0,
      revenue: 0,
    });
  }
  for (const row of applicationsTrend) {
    const key = `${row._id.year}-${row._id.month}`;
    if (trendMap.has(key)) trendMap.get(key).applications = row.applications;
  }
  for (const row of issuedTrend) {
    const key = `${row._id.year}-${row._id.month}`;
    if (trendMap.has(key)) trendMap.get(key).issued = row.issued;
  }
  for (const row of revenueByMonth) {
    const key = `${row._id.year}-${row._id.month}`;
    if (trendMap.has(key)) trendMap.get(key).revenue = Number(row.revenue || 0);
  }

  const revenueRow = revenueTotals[0] || { totalRevenue: 0, count: 0 };
  const prevRevenueRow = prevRevenueTotals[0] || { totalRevenue: 0 };

  return success(res, {
    kpis: {
      totalApplications: totalInPeriod,
      pendingReview,
      atEmbassy,
      activeEmbassies: embassyCount,
      revenue: Number(revenueRow.totalRevenue || 0),
      totalApplicationsDelta: pctDelta(totalInPeriod, prevTotalInPeriod),
      revenueDelta: pctDelta(
        Number(revenueRow.totalRevenue || 0),
        prev ? Number(prevRevenueRow.totalRevenue || 0) : null
      ),
      pendingDelta: {
        delta: String(pendingReview),
        trend: pendingReview > 0 ? 'up' : 'flat',
      },
      embassyDelta: {
        delta: String(atEmbassy),
        trend: atEmbassy > 0 ? 'up' : 'flat',
      },
    },
    byStatus,
    byVisaType,
    byEmbassy,
    monthlyTrend: Array.from(trendMap.values()),
    revenue: {
      total: Number(revenueRow.totalRevenue || 0),
      paymentCount: revenueRow.count || 0,
    },
  });
});

module.exports = { dashboard };
