const mongoose = require('mongoose');

const formFieldSchema = new mongoose.Schema(
  {
    visaTypeCode: { type: String, required: true, index: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
    dataType: {
      type: String,
      enum: ['string', 'text', 'date', 'number', 'boolean', 'select', 'email', 'phone'],
      required: true,
    },
    required: { type: Boolean, default: true },
    options: [{ type: String }],
    validation: {
      min: Number,
      max: Number,
      pattern: String,
      message: String,
    },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

formFieldSchema.index({ visaTypeCode: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('FormField', formFieldSchema);
