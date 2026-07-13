const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in', 'exists'],
      required: true,
    },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const documentRequirementSchema = new mongoose.Schema(
  {
    visaTypeCode: { type: String, required: true, index: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['upload', 'form_field'], required: true },
    required: { type: Boolean, default: true },
    description: { type: String, default: '' },
    acceptedFormats: [{ type: String }],
    conditions: [conditionSchema],
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

documentRequirementSchema.index({ visaTypeCode: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('DocumentRequirement', documentRequirementSchema);
