const mongoose = require('mongoose');

const applicationDocumentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    key: { type: String, required: true, index: true },
    label: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storageProvider: { type: String, enum: ['local', 's3'], default: 'local' },
    storagePath: { type: String, required: true },
    checksum: { type: String },
    uploadedByType: { type: String, enum: ['applicant', 'staff', 'system'], required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId },
    category: {
      type: String,
      enum: ['applicant_upload', 'admin_delivery', 'visa_document', 'correspondence', 'internal'],
      default: 'applicant_upload',
      index: true,
    },
    visibleToApplicant: { type: Boolean, default: true },
    deliveredAt: { type: Date },
    emailNotifiedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

applicationDocumentSchema.index({ application: 1, key: 1, createdAt: -1 });

module.exports = mongoose.model('ApplicationDocument', applicationDocumentSchema);
