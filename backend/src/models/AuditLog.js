const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, index: true },
    actorType: { type: String, enum: ['staff', 'applicant', 'system', 'embassy'], required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, index: true },
    actorEmail: String,
    actorRole: String,
    ip: String,
    userAgent: String,
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
