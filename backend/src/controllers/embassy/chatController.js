const ChatRoom = require('../../models/ChatRoom');
const ChatMessage = require('../../models/ChatMessage');
const Embassy = require('../../models/Embassy');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const { parsePagination } = require('../../utils/helpers');
const { activityFromReq } = require('../../services/embassyActivityService');
const { assertEmbassyApplicationAccess } = require('../../services/embassyAccessService');
const {
  unreadCountsByRoom,
  totalUnread,
  markRoomRead,
} = require('../../services/chatReadService');

function embassyCanAccessRoom(embassyId, room) {
  if (!room) return false;
  if (String(room.embassy) === String(embassyId)) return true;
  if (room.peerEmbassy && String(room.peerEmbassy) === String(embassyId)) return true;
  return false;
}

function embassyRefId(value) {
  if (!value) return '';
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
}

async function roomsForEmbassy(embassyId, query = {}) {
  const filter = {
    isActive: true,
    $or: [{ embassy: embassyId }, { peerEmbassy: embassyId }],
  };
  if (query.type) filter.type = query.type;
  if (query.application) filter.application = query.application;

  return ChatRoom.find(filter)
    .populate('application', 'referenceId status')
    .populate('embassy', 'name code')
    .populate('peerEmbassy', 'name code')
    .sort({ lastMessageAt: -1, updatedAt: -1 });
}

const listPeerEmbassies = asyncHandler(async (req, res) => {
  const peers = await Embassy.find({
    isActive: true,
    _id: { $ne: req.embassyId },
  })
    .select('name code')
    .sort({ name: 1 })
    .lean();

  return success(res, peers, { count: peers.length });
});

const unreadSummary = asyncHandler(async (req, res) => {
  const rooms = await ChatRoom.find({
    isActive: true,
    $or: [{ embassy: req.embassyId }, { peerEmbassy: req.embassyId }],
  }).select('_id');

  const roomIds = rooms.map((r) => r._id);
  const total = await totalUnread(roomIds, req.embassyStaff._id);
  return success(res, { totalUnread: total }, { totalUnread: total });
});

const listRooms = asyncHandler(async (req, res) => {
  const rooms = await roomsForEmbassy(req.embassyId, req.query);
  const counts = await unreadCountsByRoom(
    rooms.map((r) => r._id),
    req.embassyStaff._id
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
  await assertEmbassyApplicationAccess(req, req.body.applicationId);

  let room = await ChatRoom.findOne({
    embassy: req.embassyId,
    application: req.body.applicationId,
    type: 'application',
  });

  if (!room) {
    room = await ChatRoom.create({
      embassy: req.embassyId,
      application: req.body.applicationId,
      type: 'application',
      title: req.body.title || `Case chat — ${req.body.applicationId}`,
      createdBy: undefined,
    });
  }

  return success(res, room, null, 201);
});

const ensureInterEmbassyRoom = asyncHandler(async (req, res) => {
  const peerEmbassyId = req.body.peerEmbassyId;
  if (!peerEmbassyId) throw new ApiError(400, 'peerEmbassyId is required');
  if (String(peerEmbassyId) === String(req.embassyId)) {
    throw new ApiError(400, 'Cannot start a chat with your own embassy');
  }

  const peer = await Embassy.findById(peerEmbassyId);
  if (!peer || !peer.isActive) throw new ApiError(404, 'Peer embassy not found or inactive');

  const self = await Embassy.findById(req.embassyId).select('name code');
  const pairKey = ChatRoom.makePairKey(req.embassyId, peerEmbassyId);

  let room = await ChatRoom.findOne({ type: 'inter_embassy', pairKey });
  let created = false;

  if (!room) {
    const title =
      req.body.title ||
      `Coordination — ${self?.code || 'ME'} × ${peer.code}`;

    room = await ChatRoom.create({
      embassy: req.embassyId,
      peerEmbassy: peerEmbassyId,
      type: 'inter_embassy',
      pairKey,
      title,
      isActive: true,
    });
    created = true;
  }

  room = await ChatRoom.findById(room._id)
    .populate('embassy', 'name code')
    .populate('peerEmbassy', 'name code');

  return success(res, room, null, created ? 201 : 200);
});

const listMessages = asyncHandler(async (req, res) => {
  const room = await ChatRoom.findById(req.params.roomId);
  if (!room || !embassyCanAccessRoom(req.embassyId, room)) {
    throw new ApiError(404, 'Chat room not found');
  }

  const markRead = req.query.markRead !== 'false' && req.query.markRead !== '0';
  if (markRead) {
    await markRoomRead(room._id, 'embassy_staff', req.embassyStaff._id);
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
  if (!room || !embassyCanAccessRoom(req.embassyId, room)) {
    throw new ApiError(404, 'Chat room not found');
  }

  const result = await markRoomRead(room._id, 'embassy_staff', req.embassyStaff._id);
  return success(res, { roomId: room._id, ...result });
});

const sendMessage = asyncHandler(async (req, res) => {
  const room = await ChatRoom.findById(req.params.roomId);
  if (!room || !room.isActive || !embassyCanAccessRoom(req.embassyId, room)) {
    throw new ApiError(404, 'Chat room not found or inactive');
  }

  const attachments = (req.files || []).map((f) => ({
    originalName: f.originalname,
    mimeType: f.mimetype,
    storagePath: `chat/${f.filename}`,
    size: f.size,
  }));

  const message = await ChatMessage.create({
    room: room._id,
    body: req.body.body,
    senderType: 'embassy_staff',
    senderId: req.embassyStaff._id,
    senderName: `${req.embassyStaff.firstName} ${req.embassyStaff.lastName}`,
    senderRole: req.embassyStaff.role,
    attachments,
    readBy: [
      {
        readerType: 'embassy_staff',
        readerId: req.embassyStaff._id,
        readAt: new Date(),
      },
    ],
  });

  room.lastMessageAt = new Date();
  await room.save();

  await activityFromReq(req, {
    action: 'chat.message',
    resourceType: 'ChatRoom',
    resourceId: room._id,
    application: room.application,
    meta: {
      roomType: room.type,
      peerEmbassy: room.peerEmbassy ? embassyRefId(room.peerEmbassy) : undefined,
    },
  });

  return success(res, message, null, 201);
});

module.exports = {
  listPeerEmbassies,
  unreadSummary,
  listRooms,
  ensureApplicationRoom,
  ensureInterEmbassyRoom,
  listMessages,
  markRead,
  sendMessage,
};
