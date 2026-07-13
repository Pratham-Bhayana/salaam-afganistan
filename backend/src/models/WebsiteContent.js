const mongoose = require('mongoose');

const websiteContentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['announcement', 'banner', 'faq', 'page'],
      required: true,
      index: true,
    },
    slug: { type: String, trim: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    locale: { type: String, default: 'en' },
    isPublished: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 100 },
    startsAt: Date,
    endsAt: Date,
    meta: mongoose.Schema.Types.Mixed,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true }
);

websiteContentSchema.index({ type: 1, isPublished: 1, sortOrder: 1 });

module.exports = mongoose.model('WebsiteContent', websiteContentSchema);
