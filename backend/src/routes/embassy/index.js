const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');

const { validate } = require('../../middleware/validate');
const {
  authenticateEmbassyStaff,
  requireEmbassyPermission,
} = require('../../middleware/embassyAuth');
const { EMBASSY_PERMISSIONS } = require('../../config/embassyPermissions');
const { uploadChatAttachment } = require('../../middleware/upload');

const authController = require('../../controllers/embassy/authController');
const staffController = require('../../controllers/embassy/staffController');
const applicationController = require('../../controllers/embassy/applicationController');
const chatController = require('../../controllers/embassy/chatController');
const reportsController = require('../../controllers/embassy/reportsController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, try again later' },
});

// ─── Auth ────────────────────────────────────────────────────────────────────
router.post('/auth/login', authLimiter, authController.loginValidators, validate, authController.login);
router.post(
  '/auth/refresh',
  authLimiter,
  body('refreshToken').notEmpty(),
  validate,
  authController.refresh
);
router.post(
  '/auth/forgot-password',
  authLimiter,
  body('email').isEmail(),
  validate,
  authController.forgotPassword
);
router.post(
  '/auth/reset-password',
  authLimiter,
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  validate,
  authController.resetPassword
);

router.use(authenticateEmbassyStaff);

router.post('/auth/logout', authController.logout);
router.get('/auth/me', authController.me);

// ─── Applications (9.1 / 9.2) ────────────────────────────────────────────────
router.get(
  '/applications',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.APPLICATIONS_READ),
  applicationController.list
);
router.get(
  '/applications/:id',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.APPLICATIONS_READ),
  applicationController.getById
);
router.post(
  '/applications/:id/decide',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.APPLICATIONS_DECIDE),
  body('toStatus').isIn([
    'under_embassy_review',
    'approved',
    'rejected',
    'documents_required',
  ]),
  validate,
  applicationController.decide
);
router.post(
  '/applications/:id/assign',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.APPLICATIONS_ASSIGN),
  applicationController.assign
);
router.post(
  '/applications/:id/notes',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.APPLICATIONS_DECIDE),
  body('note').notEmpty(),
  validate,
  applicationController.addNote
);
router.get(
  '/applications/:id/documents/:documentId',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.DOCUMENTS_VIEW),
  applicationController.viewDocument
);

// ─── Chat (9.3) ──────────────────────────────────────────────────────────────
router.get('/chat/rooms', requireEmbassyPermission(EMBASSY_PERMISSIONS.CHAT_ACCESS), chatController.listRooms);
router.post(
  '/chat/rooms/application',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.CHAT_ACCESS),
  body('applicationId').notEmpty(),
  validate,
  chatController.ensureApplicationRoom
);
router.get(
  '/chat/rooms/:roomId/messages',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.CHAT_ACCESS),
  chatController.listMessages
);
router.post(
  '/chat/rooms/:roomId/messages',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.CHAT_ACCESS),
  uploadChatAttachment.array('attachments', 5),
  body('body').notEmpty(),
  validate,
  chatController.sendMessage
);

// ─── Reports (9.4) ───────────────────────────────────────────────────────────
router.get(
  '/reports',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.REPORTS_READ),
  reportsController.reports
);
router.get(
  '/reports/payments',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.REPORTS_READ),
  reportsController.paymentSummary
);

// ─── Activity logs (9.5) ─────────────────────────────────────────────────────
router.get(
  '/activity-logs',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.ACTIVITY_READ),
  reportsController.activityLogs
);

// ─── Staff management (9.6) ──────────────────────────────────────────────────
router.get('/staff', requireEmbassyPermission(EMBASSY_PERMISSIONS.STAFF_MANAGE), staffController.list);
router.get('/staff/:id', requireEmbassyPermission(EMBASSY_PERMISSIONS.STAFF_MANAGE), staffController.getById);
router.post(
  '/staff',
  requireEmbassyPermission(EMBASSY_PERMISSIONS.STAFF_MANAGE),
  staffController.createValidators,
  validate,
  staffController.create
);
router.patch('/staff/:id', requireEmbassyPermission(EMBASSY_PERMISSIONS.STAFF_MANAGE), staffController.update);
router.delete('/staff/:id', requireEmbassyPermission(EMBASSY_PERMISSIONS.STAFF_MANAGE), staffController.remove);

module.exports = router;
