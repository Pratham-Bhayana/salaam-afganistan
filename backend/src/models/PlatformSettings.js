const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    branding: {
      platformName: { type: String, default: 'Salaam Afghanistan' },
      logoUrl: String,
      faviconUrl: String,
      primaryColor: { type: String, default: '#0B3D2E' },
      secondaryColor: { type: String, default: '#C4A35A' },
      supportEmail: String,
      supportPhone: String,
    },
    notifications: {
      emailEnabled: { type: Boolean, default: true },
      inAppEnabled: { type: Boolean, default: true },
      statusChangeEmails: { type: Boolean, default: true },
      documentRequestEmails: { type: Boolean, default: true },
      visaIssuedEmails: { type: Boolean, default: true },
    },
    localization: {
      languages: { type: [String], default: ['en'] },
      defaultLanguage: { type: String, default: 'en' },
      currencies: { type: [String], default: ['USD'] },
      defaultCurrency: { type: String, default: 'USD' },
    },
    security: {
      sessionTimeoutMinutes: { type: Number, default: 60 },
      maxLoginAttempts: { type: Number, default: 5 },
      requireMfaForAdmin: { type: Boolean, default: false },
    },
    system: {
      maintenanceMode: { type: Boolean, default: false },
      allowManualApplications: { type: Boolean, default: true },
      autoGenerateVisaOnApprove: { type: Boolean, default: true },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
