const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    embassy: { type: mongoose.Schema.Types.ObjectId, ref: 'Embassy', required: true, index: true },
    peerEmbassy: { type: mongoose.Schema.Types.ObjectId, ref: 'Embassy', index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },
    type: {
      type: String,
      enum: ['general', 'application', 'inter_embassy'],
      default: 'general',
      index: true,
    },
    /** Canonical sorted pair for inter_embassy uniqueness: "<idA>:<idB>" */
    pairKey: { type: String, sparse: true, unique: true },
    title: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    lastMessageAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

chatRoomSchema.index({ embassy: 1, type: 1, application: 1 }, { unique: true, sparse: true });

chatRoomSchema.statics.makePairKey = function makePairKey(a, b) {
  return [String(a), String(b)].sort().join(':');
};

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
