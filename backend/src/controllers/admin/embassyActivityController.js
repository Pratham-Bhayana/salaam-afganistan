const EmbassyActivityLog = require('../../models/EmbassyActivityLog');
const Embassy = require('../../models/Embassy');
const { asyncHandler, success } = require('../../middleware/error');
const { parsePagination } = require('../../utils/helpers');

/**
 * Admin view of embassy-panel activity (separate from the platform AuditLog).
 * Every action performed by any embassy user is recorded to EmbassyActivityLog
 * via embassyActivityService; this endpoint exposes it to admins.
 */
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.embassy) filter.embassy = req.query.embassy;
  if (req.query.embassyStaff) filter.embassyStaff = req.query.embassyStaff;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.resourceType) filter.resourceType = req.query.resourceType;
  if (req.query.application) filter.application = req.query.application;

  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) {
      const from = new Date(req.query.from);
      if (!Number.isNaN(from.getTime())) filter.createdAt.$gte = from;
    }
    if (req.query.to) {
      const to = new Date(req.query.to);
      if (!Number.isNaN(to.getTime())) filter.createdAt.$lte = to;
    }
    if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
  }

  const [data, total] = await Promise.all([
    EmbassyActivityLog.find(filter)
      .populate('embassy', 'name code')
      .populate('embassyStaff', 'firstName lastName email role')
      .populate('application', 'referenceId status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    EmbassyActivityLog.countDocuments(filter),
  ]);

  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

/** Lightweight embassy list for the admin activity filter dropdown. */
const embassyOptions = asyncHandler(async (_req, res) => {
  const data = await Embassy.find({}).select('name code').sort({ name: 1 }).lean();
  return success(res, data);
});

module.exports = { list, embassyOptions };
