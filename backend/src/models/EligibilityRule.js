const mongoose = require('mongoose');

const eligibilityRuleSchema = new mongoose.Schema(
  {
    visaTypeCode: { type: String, required: true, unique: true, index: true },
    blockedNationalities: [{ type: String }],
    blockedResidences: [{ type: String }],
    hardRefuseNationalities: [{ type: String }],
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EligibilityRule', eligibilityRuleSchema);
