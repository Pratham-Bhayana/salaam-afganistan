const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    embassy: { type: mongoose.Schema.Types.ObjectId, ref: 'Embassy', required: true, index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },
    type: { type: String, enum: ['general', 'application'], default: 'general', index: true },
    title: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastMessageAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

chatRoomSchema.index({ embassy: 1, type: 1, application: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
