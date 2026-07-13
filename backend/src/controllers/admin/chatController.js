const ChatRoom = require('../../models/ChatRoom');
const ChatMessage = require('../../models/ChatMessage');
const Embassy = require('../../models/Embassy');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const { parsePagination } = require('../../utils/helpers');

const listRooms = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.embassy) filter.embassy = req.query.embassy;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.application) filter.application = req.query.application;

  const rooms = await ChatRoom.find(filter)
    .populate('embassy', 'name code')
    .populate('application', 'referenceId status')
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  return success(res, rooms, { count: rooms.length });
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

  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const [data, total] = await Promise.all([
    ChatMessage.find({ room: room._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ChatMessage.countDocuments({ room: room._id }),
  ]);

  return success(res, data.reverse(), { page, limit, total, pages: Math.ceil(total / limit) });
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
  });

  room.lastMessageAt = new Date();
  await room.save();

  return success(res, message, null, 201);
});

module.exports = {
  listRooms,
  ensureApplicationRoom,
  listMessages,
  sendMessage,
};
