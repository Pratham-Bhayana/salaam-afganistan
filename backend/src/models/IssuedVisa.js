const mongoose = require('mongoose');

const issuedVisaSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
      index: true,
    },
    referenceId: { type: String, required: true, unique: true, index: true },
    visaNumber: { type: String, required: true, unique: true, index: true },
    visaTypeCode: { type: String, required: true, index: true },
    applicantName: { type: String, required: true, index: true },
    nationality: { type: String, uppercase: true },
    passportNumber: { type: String, index: true },
    embassy: { type: mongoose.Schema.Types.ObjectId, ref: 'Embassy', index: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'VisaTemplate' },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    entries: { type: String, default: 'single' },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'ApplicationDocument' },
    storagePath: { type: String, required: true },
    qrPayload: String,
    /** Random token embedded in PDF QR — scanning opens the public verify/PDF URL */
    verificationToken: { type: String, unique: true, sparse: true, index: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    issuedByEmbassyStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'EmbassyStaff' },
    issuedAt: { type: Date, default: Date.now, index: true },
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

issuedVisaSchema.index({ issuedAt: -1, visaTypeCode: 1 });

module.exports = mongoose.model('IssuedVisa', issuedVisaSchema);
