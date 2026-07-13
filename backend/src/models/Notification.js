const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    audience: {
      type: String,
      enum: ['applicant', 'staff', 'embassy'],
      required: true,
      index: true,
    },
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    channel: { type: String, enum: ['in_app', 'email', 'both'], default: 'both' },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    meta: mongoose.Schema.Types.Mixed,
    isRead: { type: Boolean, default: false, index: true },
    emailSentAt: Date,
    readAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
