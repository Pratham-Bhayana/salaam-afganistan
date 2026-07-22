const ChatRoom = require('../../models/ChatRoom');
const ChatMessage = require('../../models/ChatMessage');
const Embassy = require('../../models/Embassy');
const Notification = require('../../models/Notification');
const EmbassyStaff = require('../../models/EmbassyStaff');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const { parsePagination } = require('../../utils/helpers');
const { unreadCountsByRoom, markRoomRead, totalUnread } = require('../../services/chatReadService');

function messagePreview(body, max = 160) {
  const text = String(body || '').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function notifyEmbassyStaffOfChatMessage(room, message, senderName) {
  const embassyIds = [room.embassy];
  if (room.peerEmbassy) embassyIds.push(room.peerEmbassy);

  const recipients = await EmbassyStaff.find({
    isActive: true,
    embassy: { $in: embassyIds.filter(Boolean) },
  })
    .select('_id')
    .lean();

  if (!recipients.length) return;

  await Notification.insertMany(
    recipients.map((recipient) => ({
      audience: 'embassy',
      recipientId: recipient._id,
      channel: 'in_app',
      type: 'chat.message',
      title: 'New chat message',
      body: `${senderName}: ${messagePreview(message.body)}`,
      application: room.application,
      meta: { roomId: room._id, messageId: message._id, roomType: room.type },
    }))
  );
}

const unreadSummary = asyncHandler(async (req, res) => {
  const rooms = await ChatRoom.find({ isActive: true }).select('_id');
  const total = await totalUnread(
    rooms.map((r) => r._id),
    req.staff._id
  );
  return success(res, { totalUnread: total }, { totalUnread: total });
});

const listRooms = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.embassy) filter.embassy = req.query.embassy;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.application) filter.application = req.query.application;

  const rooms = await ChatRoom.find(filter)
    .populate('embassy', 'name code')
    .populate('peerEmbassy', 'name code')
    .populate('application', 'referenceId status')
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  const counts = await unreadCountsByRoom(
    rooms.map((r) => r._id),
    req.staff._id
  );

  const data = rooms.map((room) => {
    const obj = room.toObject();
    obj.unreadCount = counts.get(String(room._id)) || 0;
    return obj;
  });

  const totalUnreadCount = data.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
  return success(res, data, { count: data.length, totalUnread: totalUnreadCount });
});

const ensureApplicationRoom = asyncHandler(async (req, res) => {
  const { embassyId, applicationId, title } = req.body;
  const embassy = await Embassy.findById(embassyId);
  if (!embassy) throw new ApiError(404, 'Embassy not found');

  let room = await ChatRoom.findOne({
    embassy: embassyId,
    application: applicationId,
    type: 'application',
  });

  if (!room) {
    room = await ChatRoom.create({
      embassy: embassyId,
      application: applicationId,
      type: 'application',
      title: title || `Case chat — ${applicationId}`,
      createdBy: req.staff._id,
    });
  }

  return success(res, room, null, 201);
});

const listMessages = asyncHandler(async (req, res) => {
  const room = await ChatRoom.findById(req.params.roomId);
  if (!room) throw new ApiError(404, 'Chat room not found');

  const markRead = req.query.markRead !== 'false' && req.query.markRead !== '0';
  if (markRead) {
    await markRoomRead(room._id, 'staff', req.staff._id);
  }

  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const [data, total] = await Promise.all([
    ChatMessage.find({ room: room._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ChatMessage.countDocuments({ room: room._id }),
  ]);

  return success(res, data.reverse(), { page, limit, total, pages: Math.ceil(total / limit) });
});

const markRead = asyncHandler(async (req, res) => {
  const room = await ChatRoom.findById(req.params.roomId);
  if (!room) throw new ApiError(404, 'Chat room not found');

  const result = await markRoomRead(room._id, 'staff', req.staff._id);
  return success(res, { roomId: room._id, ...result });
});

const sendMessage = asyncHandler(async (req, res) => {
  const room = await ChatRoom.findById(req.params.roomId);
  if (!room || !room.isActive) throw new ApiError(404, 'Chat room not found or inactive');

  const attachments = (req.files || []).map((f) => ({
    originalName: f.originalname,
    mimeType: f.mimetype,
    storagePath: `chat/${f.filename}`,
    size: f.size,
  }));

  const message = await ChatMessage.create({
    room: room._id,
    body: req.body.body,
    senderType: 'staff',
    senderId: req.staff._id,
    senderName: `${req.staff.firstName} ${req.staff.lastName}`,
    senderRole: req.staff.role,
    attachments,
    readBy: [
      {
        readerType: 'staff',
        readerId: req.staff._id,
        readAt: new Date(),
      },
    ],
  });

  room.lastMessageAt = new Date();
  await room.save();

  const senderName = `${req.staff.firstName} ${req.staff.lastName}`.trim();
  await notifyEmbassyStaffOfChatMessage(room, message, senderName);

  return success(res, message, null, 201);
});

module.exports = {
  unreadSummary,
  listRooms,
  ensureApplicationRoom,
  listMessages,
  markRead,
  sendMessage,
};
