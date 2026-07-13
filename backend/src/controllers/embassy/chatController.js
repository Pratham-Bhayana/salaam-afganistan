const ChatRoom = require('../../models/ChatRoom');
const ChatMessage = require('../../models/ChatMessage');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const { parsePagination } = require('../../utils/helpers');
const { activityFromReq } = require('../../services/embassyActivityService');
const { assertEmbassyApplicationAccess } = require('../../services/embassyAccessService');

const listRooms = asyncHandler(async (req, res) => {
  const filter = { embassy: req.embassyId, isActive: true };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.application) filter.application = req.query.application;

  const rooms = await ChatRoom.find(filter)
    .populate('application', 'referenceId status')
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  return success(res, rooms, { count: rooms.length });
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

const listMessages = asyncHandler(async (req, res) => {
  const room = await ChatRoom.findOne({
    _id: req.params.roomId,
    embassy: req.embassyId,
  });
  if (!room) throw new ApiError(404, 'Chat room not found');

  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });
  const [data, total] = await Promise.all([
    ChatMessage.find({ room: room._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ChatMessage.countDocuments({ room: room._id }),
  ]);

  return success(res, data.reverse(), { page, limit, total, pages: Math.ceil(total / limit) });
});

const sendMessage = asyncHandler(async (req, res) => {
  const room = await ChatRoom.findOne({
    _id: req.params.roomId,
    embassy: req.embassyId,
    isActive: true,
  });
  if (!room) throw new ApiError(404, 'Chat room not found or inactive');

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
  });

  room.lastMessageAt = new Date();
  await room.save();

  await activityFromReq(req, {
    action: 'chat.message',
    resourceType: 'ChatRoom',
    resourceId: room._id,
    application: room.application,
  });

  return success(res, message, null, 201);
});

module.exports = {
  listRooms,
  ensureApplicationRoom,
  listMessages,
  sendMessage,
};
