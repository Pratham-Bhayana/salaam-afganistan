const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    /** Optional absolute coords for legacy designers */
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number },
    height: { type: Number },
    fontSize: { type: Number, default: 12 },
    align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  },
  { _id: false }
);

const layoutSchema = new mongoose.Schema(
  {
    govLine: { type: String, default: 'ISLAMIC EMIRATE OF AFGHANISTAN' },
    ministryLine: { type: String, default: 'Ministry of Foreign Affairs' },
    systemLine: { type: String, default: 'Salaam Afghanistan — Electronic Visa System' },
    sectionTitle: { type: String, default: 'eVISA Holder Information' },
    accentColor: { type: String, default: '#1B4D45' },
    fontSize: { type: Number, default: 13 },
    salaamLogoUrl: { type: String, default: '/Logo.png' },
    embassyLogoUrl: { type: String, default: '/taliban-flag.png' },
    disclaimer: {
      type: String,
      default:
        'This electronic visa authorizes travel to Afghanistan but does not guarantee entry. Travelers are subject to inspection by border and immigration officers. The Islamic Emirate of Afghanistan reserves the right to refuse admission. Alteration or misuse of this document is a punishable offence.',
    },
    showPhoto: { type: Boolean, default: true },
    showPageNumbers: { type: Boolean, default: false },
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
    /** Legacy flat placeholder list (also mirrors active visa-type fields) */
    placeholders: [fieldSchema],
    /**
     * Fields used when generating a visa for a given category:
     * tourist | business | student | transit
     */
    fieldsByVisaType: {
      type: Map,
      of: [fieldSchema],
      default: undefined,
    },
    /** Layout chrome for the single eVISA sheet */
    layout: { type: layoutSchema, default: () => ({}) },
    includeQr: { type: Boolean, default: true },
    includeBarcode: { type: Boolean, default: true },
    sealImageUrl: String,
    logoImageUrl: String,
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VisaTemplate', visaTemplateSchema);
