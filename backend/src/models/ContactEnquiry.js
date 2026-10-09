const mongoose = require('mongoose');

const contactEnquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180, index: true },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    subject: { type: String, required: true, trim: true, maxlength: 180 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ['new', 'read', 'archived'],
      default: 'new',
      index: true,
    },
    source: { type: String, default: 'website' },
    ip: String,
  },
  { timestamps: true }
);

contactEnquirySchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactEnquiry', contactEnquirySchema);
