const Application = require('../../models/Application');
const Notification = require('../../models/Notification');
const { asyncHandler, success } = require('../../middleware/error');
const { parsePagination } = require('../../utils/helpers');

/**
 * Dashboard for profile home: applications summary + unread notifications.
 */
const dashboard = asyncHandler(async (req, res) => {
  const applicantId = req.applicant._id;

  const [applications, unreadCount, latestNotifications] = await Promise.all([
    Application.find({ applicant: applicantId })
      .select('referenceId visaTypeCode status paymentStatus submittedAt updatedAt issuedAt')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean(),
    Notification.countDocuments({
      audience: 'applicant',
      recipientId: applicantId,
      isRead: false,
    }),
    Notification.find({
      audience: 'applicant',
      recipientId: applicantId,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  return success(res, {
    applicant: req.applicant.toJSON(),
    applications,
    notifications: {
      unreadCount,
      latest: latestNotifications,
    },
  });
});

module.exports = { dashboard };
