const mongoose = require('mongoose');

const embassyRefreshTokenSchema = new mongoose.Schema(
  {
    embassyStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmbassyStaff',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    userAgent: { type: String },
    ip: { type: String },
  },
  { timestamps: true }
);

embassyRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmbassyRefreshToken', embassyRefreshTokenSchema);
