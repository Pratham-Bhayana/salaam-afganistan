const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { EMBASSY_ROLES } = require('../config/embassyPermissions');

const embassyStaffSchema = new mongoose.Schema(
  {
    embassy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Embassy',
      required: true,
      index: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(EMBASSY_ROLES),
      required: true,
      index: true,
    },
    phone: { type: String, trim: true },
    designation: { type: String, trim: true },
    /**
     * all = every application routed to this embassy
     * assigned = only applications assigned to this staff member
     */
    accessMode: {
      type: String,
      enum: ['all', 'assigned'],
      default: 'all',
    },
    /**
     * Per-staff UI section access overrides on top of role defaults.
     * Mirrors the admin Staff model — keys are embassy panel section ids.
     */
    sectionOverrides: {
      type: Map,
      of: Boolean,
      default: undefined,
    },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    createdByEmbassyStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'EmbassyStaff' },
    createdByAdminStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

embassyStaffSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

embassyStaffSchema.methods.comparePassword = async function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

embassyStaffSchema.statics.hashPassword = async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
};

embassyStaffSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpiresAt;
    delete ret.__v;
    return ret;
  },
});

embassyStaffSchema.index({ embassy: 1, role: 1, isActive: 1 });

module.exports = mongoose.model('EmbassyStaff', embassyStaffSchema);
