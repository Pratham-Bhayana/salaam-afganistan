const PlatformSettings = require('../../models/PlatformSettings');
const AuditLog = require('../../models/AuditLog');
const { asyncHandler, success, ApiError } = require('../../middleware/error');
const { parsePagination } = require('../../utils/helpers');
const { auditFromReq } = require('../../services/auditService');

const getSettings = asyncHandler(async (_req, res) => {
  let settings = await PlatformSettings.findOne({ key: 'default' });
  if (!settings) {
    settings = await PlatformSettings.create({ key: 'default' });
  }
  return success(res, settings);
});

const updateSettings = asyncHandler(async (req, res) => {
  let settings = await PlatformSettings.findOne({ key: 'default' });
  if (!settings) settings = new PlatformSettings({ key: 'default' });
  const before = settings.toObject();

  ['branding', 'notifications', 'localization', 'security', 'system'].forEach((section) => {
    if (req.body[section]) {
      settings[section] = { ...(settings[section]?.toObject?.() || settings[section] || {}), ...req.body[section] };
    }
  });
  settings.updatedBy = req.staff._id;
  await settings.save();

  await auditFromReq(req, {
    action: 'settings.update',
    resourceType: 'PlatformSettings',
    resourceId: settings._id,
    before,
    after: settings.toObject(),
  });

  return success(res, settings);
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.resourceType) filter.resourceType = req.query.resourceType;
  if (req.query.resourceId) filter.resourceId = req.query.resourceId;
  if (req.query.actorId) filter.actorId = req.query.actorId;

  const [data, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

module.exports = {
  getSettings,
  updateSettings,
  listAuditLogs,
};
