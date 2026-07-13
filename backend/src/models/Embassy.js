const mongoose = require('mongoose');

const embassySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    logoUrl: String,
    branding: {
      primaryColor: String,
      secondaryColor: String,
    },
    contact: {
      email: String,
      phone: String,
      address: String,
      city: String,
      country: String,
    },
    jurisdictionCountries: [{ type: String, uppercase: true }],
    supportedVisaTypeCodes: [{ type: String }],
    isActive: { type: Boolean, default: true, index: true },
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Embassy', embassySchema);
