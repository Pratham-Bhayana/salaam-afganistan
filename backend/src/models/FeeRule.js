const mongoose = require('mongoose');

const feeRuleSchema = new mongoose.Schema(
  {
    visaTypeCode: { type: String, required: true, index: true },
    nationality: { type: String, required: true, default: 'ALL' },
    processing: {
      type: String,
      enum: ['standard', 'express', 'flat'],
      required: true,
    },
    stage: {
      type: String,
      enum: ['initial', 'remainder', 'flat'],
      required: true,
    },
    currency: { type: String, required: true, default: 'USD' },
    amount: { type: Number, required: true },
    label: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

feeRuleSchema.index(
  { visaTypeCode: 1, nationality: 1, processing: 1, stage: 1 },
  { unique: true }
);

module.exports = mongoose.model('FeeRule', feeRuleSchema);
