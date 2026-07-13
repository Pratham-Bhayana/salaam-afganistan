const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true, index: true },
    body: { type: String, required: true, trim: true },
    senderType: { type: String, enum: ['staff', 'embassy_staff', 'system'], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderName: { type: String, required: true },
    senderRole: String,
    attachments: [
      {
        originalName: String,
        mimeType: String,
        storagePath: String,
        size: Number,
      },
    ],
    readBy: [
      {
        readerType: String,
        readerId: mongoose.Schema.Types.ObjectId,
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

chatMessageSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
