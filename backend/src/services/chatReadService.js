const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');

function asObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

/**
 * Unread = messages not sent by this reader and without their readerId in readBy.
 */
async function unreadCountsByRoom(roomIds, readerId) {
  const readerOid = asObjectId(readerId);
  const ids = (roomIds || []).map(asObjectId).filter(Boolean);
  if (!readerOid || !ids.length) return new Map();

  const rows = await ChatMessage.aggregate([
    {
      $match: {
        room: { $in: ids },
        senderId: { $ne: readerOid },
        readBy: { $not: { $elemMatch: { readerId: readerOid } } },
      },
    },
    { $group: { _id: '$room', count: { $sum: 1 } } },
  ]);

  const map = new Map();
  for (const row of rows) map.set(String(row._id), row.count);
  return map;
}

async function totalUnread(roomIds, readerId) {
  const map = await unreadCountsByRoom(roomIds, readerId);
  let total = 0;
  for (const n of map.values()) total += n;
  return total;
}

async function markRoomRead(roomId, readerType, readerId) {
  const roomOid = asObjectId(roomId);
  const readerOid = asObjectId(readerId);
  if (!roomOid || !readerOid) return { modifiedCount: 0 };

  const result = await ChatMessage.updateMany(
    {
      room: roomOid,
      senderId: { $ne: readerOid },
      readBy: { $not: { $elemMatch: { readerId: readerOid } } },
    },
    {
      $push: {
        readBy: {
          readerType,
          readerId: readerOid,
          readAt: new Date(),
        },
      },
    }
  );

  return { modifiedCount: result.modifiedCount || 0 };
}

function isMessageSeen(message) {
  const sender = String(message.senderId || '');
  const readers = Array.isArray(message.readBy) ? message.readBy : [];
  return readers.some((r) => String(r.readerId) !== sender);
}

module.exports = {
  unreadCountsByRoom,
  totalUnread,
  markRoomRead,
  isMessageSeen,
};
