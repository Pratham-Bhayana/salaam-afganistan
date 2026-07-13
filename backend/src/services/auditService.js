const AuditLog = require('../models/AuditLog');

async function writeAudit({
  action,
  resourceType,
  resourceId,
  actorType = 'staff',
  actorId,
  actorEmail,
  actorRole,
  ip,
  userAgent,
  before,
  after,
  meta,
}) {
  try {
    await AuditLog.create({
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : undefined,
      actorType,
      actorId,
      actorEmail,
      actorRole,
      ip,
      userAgent,
      before,
      after,
      meta,
    });
  } catch (err) {
    // Audit failures must not break primary flows; log to stderr.
    console.error('Audit write failed:', err.message);
  }
}

function auditFromReq(req, payload) {
  return writeAudit({
    ...payload,
    actorType: payload.actorType || 'staff',
    actorId: req.staff?._id,
    actorEmail: req.staff?.email,
    actorRole: req.staff?.role,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
}

module.exports = { writeAudit, auditFromReq };
