const mongoose = require('mongoose');

const processingOptionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    minDays: { type: Number },
    maxDays: { type: Number },
  },
  { _id: false }
);

const visaTypeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    channel: { type: String, enum: ['evisa', 'embassy'], required: true },
    entries: {
      type: String,
      enum: ['single', 'multiple', 'transit', 'variable'],
      required: true,
    },
    maxStayDays: { type: Number },
    validityDays: { type: Number },
    entryPoints: [{ type: String }],
    description: { type: String, default: '' },
    processingOptions: [processingOptionSchema],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VisaType', visaTypeSchema);
