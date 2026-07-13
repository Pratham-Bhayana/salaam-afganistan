const mongoose = require('mongoose');
const { APPLICATION_STATUSES } = require('../config/statusWorkflow');

const passportDataSchema = new mongoose.Schema(
  {
    fullName: String,
    passportNumber: String,
    nationality: String,
    dateOfBirth: Date,
    sex: String,
    issueDate: Date,
    expiryDate: Date,
    issuingCountry: String,
    mrzRaw: String,
    ocrConfidence: Number,
    ocrSource: { type: String, enum: ['mrz', 'visual', 'manual', 'mixed'], default: 'manual' },
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    fromStatus: String,
    toStatus: String,
    note: String,
    actorType: { type: String, enum: ['staff', 'applicant', 'system', 'embassy'], required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId },
    actorRole: String,
    actorName: String,
    meta: mongoose.Schema.Types.Mixed,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'Applicant', index: true },
    visaTypeCode: { type: String, required: true, index: true },
    channel: { type: String, enum: ['evisa', 'embassy'], required: true, index: true },
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUSES),
      default: APPLICATION_STATUSES.PENDING,
      index: true,
    },
    source: {
      type: String,
      enum: ['website', 'admin_manual', 'phone', 'walk_in', 'receptionist'],
      default: 'website',
      index: true,
    },
    personal: {
      fullName: String,
      email: String,
      phone: String,
      dateOfBirth: Date,
      sex: String,
      nationality: { type: String, uppercase: true },
      countryOfResidence: { type: String, uppercase: true },
    },
    passport: passportDataSchema,
    travel: {
      purpose: String,
      intendedEntryDate: Date,
      intendedExitDate: Date,
      stayDurationDays: Number,
      addressInAfghanistan: String,
      citiesToVisit: String,
      processingSpeed: { type: String, enum: ['standard', 'express', 'flat'], default: 'standard' },
      extras: mongoose.Schema.Types.Mixed,
    },
    embassy: { type: mongoose.Schema.Types.ObjectId, ref: 'Embassy', index: true },
    assignedCaseManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', index: true },
    assignedEmbassyStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmbassyStaff',
      index: true,
    },
    formAnswers: { type: Map, of: mongoose.Schema.Types.Mixed },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partial'],
      default: 'unpaid',
      index: true,
    },
    documentRequestNote: String,
    rejectionReason: String,
    requestedDocuments: [
      {
        name: { type: String, required: true },
        key: { type: String, required: true },
        status: {
          type: String,
          enum: ['pending', 'uploaded', 'cancelled'],
          default: 'pending',
        },
        note: String,
        requestedAt: { type: Date, default: Date.now },
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
        fulfilledAt: Date,
        fulfilledDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'ApplicationDocument' },
      },
    ],
    submittedAt: { type: Date },
    sentToEmbassyAt: { type: Date },
    decidedAt: { type: Date },
    issuedAt: { type: Date },
    activity: [activitySchema],
    isArchived: { type: Boolean, default: false, index: true },
    createdByStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ visaTypeCode: 1, status: 1, createdAt: -1 });
applicationSchema.index({ 'personal.fullName': 'text', 'personal.email': 'text', referenceId: 'text' });

module.exports = mongoose.model('Application', applicationSchema);
