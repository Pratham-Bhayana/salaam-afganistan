const Application = require('../models/Application');
const IssuedVisa = require('../models/IssuedVisa');
const { APPLICATION_STATUSES } = require('../config/statusWorkflow');
const { escapeRegex, parsePagination, buildDateRangeFilter, toCsv } = require('../utils/helpers');

const DECISION_STATUSES = [
  APPLICATION_STATUSES.APPROVED,
  APPLICATION_STATUSES.REJECTED,
  APPLICATION_STATUSES.VISA_ISSUED,
];

const DECISION_TO_STATUSES = [
  APPLICATION_STATUSES.APPROVED,
  APPLICATION_STATUSES.REJECTED,
];

/**
 * Who made the approve/reject decision (not who issued the PDF).
 * Prefer the latest status_change into approved/rejected.
 */
function extractDecision(application) {
  const activity = Array.isArray(application.activity) ? application.activity : [];
  const decisions = activity
    .filter(
      (a) =>
        a &&
        (a.action === 'status_change' || a.action === 'status_changed') &&
        DECISION_TO_STATUSES.includes(a.toStatus)
    )
    .sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));

  const last = decisions[decisions.length - 1] || null;
  const actorType = last?.actorType || null;
  const actorName = (last?.actorName || '').trim();

  let decidedByTitle = 'Unknown';
  let decidedByOrg = 'Unknown';
  if (actorType === 'embassy') {
    decidedByOrg = 'Embassy';
    decidedByTitle = actorName ? `Embassy — ${actorName}` : 'Embassy';
  } else if (actorType === 'staff') {
    decidedByOrg = 'Raizing Global';
    decidedByTitle = actorName ? `Raizing Global — ${actorName}` : 'Raizing Global';
  } else if (actorType === 'system') {
    decidedByOrg = 'System';
    decidedByTitle = 'System';
  }

  const decisionStatus =
    last?.toStatus ||
    (application.status === APPLICATION_STATUSES.VISA_ISSUED
      ? APPLICATION_STATUSES.APPROVED
      : application.status);

  return {
    decisionStatus,
    decidedAt: last?.at || application.decidedAt || application.issuedAt || application.updatedAt,
    decidedByType: actorType || 'unknown',
    decidedByName: actorName || null,
    decidedByOrg,
    decidedByTitle,
    decisionNote: last?.note || application.rejectionReason || null,
  };
}

function resolvePeriodQuery(query = {}) {
  const period = String(query.period || 'all').toLowerCase();
  if (period === 'custom') {
    return { from: query.from, to: query.to };
  }
  if (period === 'monthly' || period === 'quarterly' || period === 'yearly') {
    return { period };
  }
  // all / empty — no date filter unless from/to provided
  if (query.from || query.to) return { from: query.from, to: query.to };
  return {};
}

function buildDecisionFilter(query = {}, { embassyOnly = false, embassyId = null } = {}) {
  const filter = {
    status: { $in: DECISION_STATUSES },
    isArchived: { $ne: true },
  };

  if (query.status && DECISION_STATUSES.includes(query.status)) {
    filter.status = query.status;
  } else if (query.decision === 'approved') {
    filter.status = { $in: [APPLICATION_STATUSES.APPROVED, APPLICATION_STATUSES.VISA_ISSUED] };
  } else if (query.decision === 'rejected') {
    filter.status = APPLICATION_STATUSES.REJECTED;
  }

  if (query.visaTypeCode) filter.visaTypeCode = query.visaTypeCode;
  if (query.embassy) filter.embassy = query.embassy;
  if (embassyId) filter.embassy = embassyId;

  Object.assign(filter, buildDateRangeFilter(resolvePeriodQuery(query), 'decidedAt'));

  // Fallback: some older rows may lack decidedAt — also match issuedAt/updatedAt via $or later if needed
  if (filter.decidedAt) {
    const range = filter.decidedAt;
    delete filter.decidedAt;
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { decidedAt: range },
          { decidedAt: null, issuedAt: range },
          { decidedAt: { $exists: false }, issuedAt: range },
          { decidedAt: null, issuedAt: null, updatedAt: range },
        ],
      },
    ];
  }

  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { referenceId: rx },
          { 'personal.fullName': rx },
          { 'personal.email': rx },
          { 'passport.passportNumber': rx },
        ],
      },
    ];
  }

  // Embassy records: only cases decided by embassy staff (exclude Raizing Global decisions)
  if (embassyOnly) {
    filter.$and = [
      ...(filter.$and || []),
      {
        activity: {
          $elemMatch: {
            action: { $in: ['status_change', 'status_changed'] },
            toStatus: { $in: DECISION_TO_STATUSES },
            actorType: 'embassy',
          },
        },
      },
    ];
  }

  return filter;
}

function mapDecisionRow(application, issuedVisaByAppId = new Map()) {
  const decision = extractDecision(application);
  const issued = issuedVisaByAppId.get(String(application._id)) || null;
  const embassy = application.embassy;

  // When scoping embassy-only list, prefer embassy org label with mission name
  let decidedByTitle = decision.decidedByTitle;
  if (decision.decidedByType === 'embassy' && embassy && typeof embassy === 'object') {
    const mission = embassy.name
      ? `${embassy.name}${embassy.code ? ` (${embassy.code})` : ''}`
      : 'Embassy';
    decidedByTitle = decision.decidedByName
      ? `${mission} — ${decision.decidedByName}`
      : mission;
  }

  return {
    _id: application._id,
    referenceId: application.referenceId,
    status: application.status,
    decisionStatus: decision.decisionStatus,
    decidedAt: decision.decidedAt,
    decidedByType: decision.decidedByType,
    decidedByOrg: decision.decidedByOrg,
    decidedByName: decision.decidedByName,
    decidedByTitle,
    decisionNote: decision.decisionNote,
    visaTypeCode: application.visaTypeCode,
    channel: application.channel,
    applicantName: application.personal?.fullName || application.passport?.fullName || '—',
    email: application.personal?.email || '',
    phone: application.personal?.phone || '',
    nationality: application.personal?.nationality || application.passport?.nationality || '',
    passportNumber: application.passport?.passportNumber || '',
    purpose: application.travel?.purpose || '',
    intendedEntryDate: application.travel?.intendedEntryDate || null,
    intendedExitDate: application.travel?.intendedExitDate || null,
    addressInAfghanistan: application.travel?.addressInAfghanistan || '',
    paymentStatus: application.paymentStatus || '',
    rejectionReason: application.rejectionReason || '',
    embassy:
      embassy && typeof embassy === 'object'
        ? { _id: embassy._id, name: embassy.name, code: embassy.code }
        : embassy || null,
    visaNumber: issued?.visaNumber || null,
    validFrom: issued?.validFrom || null,
    validUntil: issued?.validUntil || null,
    issuedAt: application.issuedAt || issued?.issuedAt || null,
    submittedAt: application.submittedAt || null,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

async function attachIssuedVisas(appIds) {
  if (!appIds.length) return new Map();
  const visas = await IssuedVisa.find({ application: { $in: appIds } })
    .select('application visaNumber validFrom validUntil issuedAt')
    .lean();
  const map = new Map();
  for (const v of visas) map.set(String(v.application), v);
  return map;
}

/**
 * Post-filter for embassy-only: ensure the *latest* decision actor is embassy
 * (elemMatch alone can match an older embassy decision even if HQ later rejected).
 */
function keepLatestEmbassyDecision(row) {
  return row.decidedByType === 'embassy';
}

async function listDecisionRecords(query = {}, options = {}) {
  const { embassyOnly = false, embassyId = null } = options;
  const { page, limit, skip } = parsePagination(query);
  const filter = buildDecisionFilter(query, { embassyOnly, embassyId });

  // Embassy-only needs a post-filter on the latest decision actor, so page in memory.
  if (embassyOnly) {
    const raw = await Application.find(filter)
      .populate('embassy', 'name code')
      .sort({ decidedAt: -1, updatedAt: -1 })
      .limit(5000)
      .lean();
    const issuedMap = await attachIssuedVisas(raw.map((r) => r._id));
    const rows = raw.map((r) => mapDecisionRow(r, issuedMap)).filter(keepLatestEmbassyDecision);
    const total = rows.length;
    return {
      data: rows.slice(skip, skip + limit),
      meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    };
  }

  const [raw, total] = await Promise.all([
    Application.find(filter)
      .populate('embassy', 'name code')
      .sort({ decidedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
  ]);

  const issuedMap = await attachIssuedVisas(raw.map((r) => r._id));
  return {
    data: raw.map((r) => mapDecisionRow(r, issuedMap)),
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

async function exportDecisionRecords(query = {}, options = {}) {
  const { embassyOnly = false, embassyId = null } = options;
  const filter = buildDecisionFilter(query, { embassyOnly, embassyId });
  const raw = await Application.find(filter)
    .populate('embassy', 'name code')
    .sort({ decidedAt: -1, updatedAt: -1 })
    .limit(5000)
    .lean();

  const issuedMap = await attachIssuedVisas(raw.map((r) => r._id));
  let rows = raw.map((r) => mapDecisionRow(r, issuedMap));
  if (embassyOnly) rows = rows.filter(keepLatestEmbassyDecision);

  const csv = toCsv(rows, [
    { label: 'referenceId', value: 'referenceId' },
    { label: 'decisionStatus', value: 'decisionStatus' },
    { label: 'currentStatus', value: 'status' },
    { label: 'decidedAt', value: (r) => (r.decidedAt ? new Date(r.decidedAt).toISOString() : '') },
    { label: 'decidedBy', value: 'decidedByTitle' },
    { label: 'decidedByOrg', value: 'decidedByOrg' },
    { label: 'applicantName', value: 'applicantName' },
    { label: 'email', value: 'email' },
    { label: 'phone', value: 'phone' },
    { label: 'nationality', value: 'nationality' },
    { label: 'passportNumber', value: 'passportNumber' },
    { label: 'visaTypeCode', value: 'visaTypeCode' },
    { label: 'channel', value: 'channel' },
    {
      label: 'embassy',
      value: (r) =>
        r.embassy && typeof r.embassy === 'object'
          ? `${r.embassy.name || ''} (${r.embassy.code || ''})`.trim()
          : '',
    },
    { label: 'purpose', value: 'purpose' },
    {
      label: 'intendedEntryDate',
      value: (r) => (r.intendedEntryDate ? new Date(r.intendedEntryDate).toISOString().slice(0, 10) : ''),
    },
    {
      label: 'intendedExitDate',
      value: (r) => (r.intendedExitDate ? new Date(r.intendedExitDate).toISOString().slice(0, 10) : ''),
    },
    { label: 'addressInAfghanistan', value: 'addressInAfghanistan' },
    { label: 'paymentStatus', value: 'paymentStatus' },
    { label: 'visaNumber', value: (r) => r.visaNumber || '' },
    {
      label: 'validFrom',
      value: (r) => (r.validFrom ? new Date(r.validFrom).toISOString().slice(0, 10) : ''),
    },
    {
      label: 'validUntil',
      value: (r) => (r.validUntil ? new Date(r.validUntil).toISOString().slice(0, 10) : ''),
    },
    { label: 'rejectionReason', value: (r) => r.rejectionReason || '' },
    { label: 'decisionNote', value: (r) => r.decisionNote || '' },
  ]);

  return csv;
}

module.exports = {
  DECISION_STATUSES,
  extractDecision,
  listDecisionRecords,
  exportDecisionRecords,
  buildDecisionFilter,
};
