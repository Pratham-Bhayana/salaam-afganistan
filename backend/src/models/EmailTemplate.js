const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    htmlBody: { type: String, required: true },
    textBody: { type: String },
    placeholders: [{ type: String }],
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
