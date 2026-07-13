const EmbassyActivityLog = require('../models/EmbassyActivityLog');

async function logEmbassyActivity({
  embassy,
  embassyStaff,
  action,
  resourceType,
  resourceId,
  application,
  ip,
  userAgent,
  meta,
}) {
  try {
    await EmbassyActivityLog.create({
      embassy,
      embassyStaff,
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : undefined,
      application,
      ip,
      userAgent,
      meta,
    });
  } catch (err) {
    console.error('Embassy activity log failed:', err.message);
  }
}

function activityFromReq(req, payload) {
  return logEmbassyActivity({
    ...payload,
    embassy: req.embassyId,
    embassyStaff: req.embassyStaff._id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
}

module.exports = {
  logEmbassyActivity,
  activityFromReq,
};
