const mongoose = require('mongoose');

/**
 * Website applicants — authenticated via Firebase
 * (Google / Email-password / Phone OTP on the client).
 * Backend verifies Firebase ID token, then issues our JWT session.
 */
const applicantSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    displayName: { type: String, trim: true },
    photoURL: { type: String, trim: true },
    nationality: { type: String, uppercase: true, trim: true },
    countryOfResidence: { type: String, uppercase: true, trim: true },
    dateOfBirth: { type: Date },
    sex: { type: String, enum: ['male', 'female', 'other', null], default: null },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    authProviders: [{ type: String }], // google.com | password | phone
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    createdVia: {
      type: String,
      enum: ['website', 'admin_manual', 'receptionist'],
      default: 'website',
    },
    createdByStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    /** Kept for legacy/manual accounts that may later link Firebase */
    passwordHash: { type: String, select: false },
  },
  { timestamps: true }
);

applicantSchema.virtual('fullName').get(function fullName() {
  if (this.displayName) return this.displayName;
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

applicantSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Applicant', applicantSchema);
