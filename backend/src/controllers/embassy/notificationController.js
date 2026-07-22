const Notification = require('../../models/Notification');
const { asyncHandler, success, ApiError } = require('../../middleware/error');
const { parsePagination } = require('../../utils/helpers');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {
    audience: 'embassy',
    recipientId: req.embassyStaff._id,
  };
  if (req.query.unreadOnly === 'true') filter.isRead = false;

  const [data, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      audience: 'embassy',
      recipientId: req.embassyStaff._id,
      isRead: false,
    }),
  ]);

  return success(res, data, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    unreadCount,
  });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.id,
      audience: 'embassy',
      recipientId: req.embassyStaff._id,
    },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found');
  return success(res, notification);
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    {
      audience: 'embassy',
      recipientId: req.embassyStaff._id,
      isRead: false,
    },
    { $set: { isRead: true, readAt: new Date() } }
  );
  return success(res, { modified: result.modifiedCount });
});

module.exports = {
  list,
  markRead,
  markAllRead,
};
