const path = require('path');
const fs = require('fs');
const Application = require('../models/Application');
const ApplicationDocument = require('../models/ApplicationDocument');
const Payment = require('../models/Payment');
const IssuedVisa = require('../models/IssuedVisa');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const Notification = require('../models/Notification');
const { uploadRoot } = require('../middleware/upload');

/**
 * Permanently delete an application and everything attached to it:
 * documents (incl. files on disk), payments, issued visa, chat rooms/messages,
 * and applicant notifications for this application.
 */
async function deleteApplicationCascade(applicationId) {
  const application = await Application.findById(applicationId);
  if (!application) return null;

  const docs = await ApplicationDocument.find({ application: application._id })
    .select('storagePath')
    .lean();
  for (const doc of docs) {
    if (!doc.storagePath) continue;
    const absolute = path.join(uploadRoot, doc.storagePath);
    try {
      if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
    } catch {
      // best-effort file cleanup; DB rows are still removed below
    }
  }

  const issued = await IssuedVisa.findOne({ application: application._id })
    .select('storagePath')
    .lean();
  if (issued?.storagePath) {
    const absolute = path.join(uploadRoot, issued.storagePath);
    try {
      if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
    } catch {
      /* best-effort */
    }
  }

  const rooms = await ChatRoom.find({ application: application._id }).select('_id').lean();
  const roomIds = rooms.map((r) => r._id);

  await Promise.all([
    ApplicationDocument.deleteMany({ application: application._id }),
    Payment.deleteMany({ application: application._id }),
    IssuedVisa.deleteMany({ application: application._id }),
    roomIds.length ? ChatMessage.deleteMany({ room: { $in: roomIds } }) : Promise.resolve(),
    ChatRoom.deleteMany({ application: application._id }),
    Notification.deleteMany({ application: application._id }),
  ]);

  const snapshot = {
    referenceId: application.referenceId,
    status: application.status,
    applicant: application.applicant,
    visaTypeCode: application.visaTypeCode,
  };

  await Application.deleteOne({ _id: application._id });

  return snapshot;
}

module.exports = { deleteApplicationCascade };
