const mongoose = require('mongoose');

/**
 * PRD 9.5 — Embassy staff activity logs (login, status changes, document views)
 */
const embassyActivityLogSchema = new mongoose.Schema(
  {
    embassy: { type: mongoose.Schema.Types.ObjectId, ref: 'Embassy', required: true, index: true },
    embassyStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'EmbassyStaff', required: true, index: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, index: true },
    resourceId: { type: String, index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },
    ip: String,
    userAgent: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

embassyActivityLogSchema.index({ embassy: 1, createdAt: -1 });
embassyActivityLogSchema.index({ embassyStaff: 1, createdAt: -1 });

module.exports = mongoose.model('EmbassyActivityLog', embassyActivityLogSchema);
