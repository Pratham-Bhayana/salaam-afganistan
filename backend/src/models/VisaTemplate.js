const mongoose = require('mongoose');

const placeholderSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    fontSize: { type: Number, default: 12 },
    align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  },
  { _id: false }
);

const visaTemplateSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    pageWidth: { type: Number, default: 595 },
    pageHeight: { type: Number, default: 842 },
    backgroundImageUrl: String,
    placeholders: [placeholderSchema],
    includeQr: { type: Boolean, default: true },
    includeBarcode: { type: Boolean, default: false },
    sealImageUrl: String,
    logoImageUrl: String,
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VisaTemplate', visaTemplateSchema);
