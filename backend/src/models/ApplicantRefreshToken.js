const mongoose = require('mongoose');

const applicantRefreshTokenSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Applicant',
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

applicantRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ApplicantRefreshToken', applicantRefreshTokenSchema);
