const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    referenceId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, default: 'manual' },
    providerPaymentId: { type: String, index: true },
    stage: { type: String, enum: ['initial', 'remainder', 'flat', 'other'], default: 'flat' },
    currency: { type: String, default: 'USD', uppercase: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'successful', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    visaTypeCode: { type: String, index: true },
    embassy: { type: mongoose.Schema.Types.ObjectId, ref: 'Embassy', index: true },
    nationality: { type: String, uppercase: true },
    processing: { type: String, enum: ['standard', 'express', 'flat'], default: 'standard' },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    failureReason: String,
    receiptUrl: String,
    rawProviderPayload: mongoose.Schema.Types.Mixed,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    notes: String,
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ paidAt: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
