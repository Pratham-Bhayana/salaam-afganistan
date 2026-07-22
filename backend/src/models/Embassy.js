const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const embassySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    /** Login email for embassy panel (embassy account). */
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, select: false },
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
    lastLoginAt: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

embassySchema.methods.comparePassword = async function comparePassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

embassySchema.statics.hashPassword = async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
};

embassySchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpiresAt;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Embassy', embassySchema);
