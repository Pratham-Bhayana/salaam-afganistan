const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');

const { validate } = require('../../middleware/validate');
const { authenticateStaff, requirePermission, requireAnyPermission } = require('../../middleware/auth');
const { PERMISSIONS } = require('../../config/permissions');
const { uploadDeliveryDoc, uploadChatAttachment } = require('../../middleware/upload');

const authController = require('../../controllers/admin/authController');
const staffController = require('../../controllers/admin/staffController');
const applicationController = require('../../controllers/admin/applicationController');
const financeController = require('../../controllers/admin/financeController');
const embassyController = require('../../controllers/admin/embassyController');
const chatController = require('../../controllers/admin/chatController');
const contentController = require('../../controllers/admin/contentController');
const settingsController = require('../../controllers/admin/settingsController');
const documentController = require('../../controllers/admin/documentController');
const issuedVisaController = require('../../controllers/admin/issuedVisaController');
const recordsController = require('../../controllers/admin/recordsController');
const dashboardController = require('../../controllers/admin/dashboardController');
const embassyActivityController = require('../../controllers/admin/embassyActivityController');
const {
  visaTypes,
  eligibilityRules,
  documentRequirements,
  formFields,
  feeRules,
} = require('../../controllers/adminConfigController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, try again later' },
});

// ─── Auth (public within /admin) ─────────────────────────────────────────────
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

// Everything below requires JWT
router.use(authenticateStaff);

router.post('/auth/logout', authController.logout);
router.get('/auth/me', authController.me);

// ─── Dashboard ───────────────────────────────────────────────────────────────
router.get(
  '/dashboard',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_READ, PERMISSIONS.FINANCE_READ),
  dashboardController.dashboard
);

// ─── Staff / RBAC (8.6) ──────────────────────────────────────────────────────
router.get('/staff', requirePermission(PERMISSIONS.STAFF_MANAGE), staffController.list);
router.get('/staff/:id', requirePermission(PERMISSIONS.STAFF_MANAGE), staffController.getById);
router.post(
  '/staff',
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  staffController.createValidators,
  validate,
  staffController.create
);
router.patch(
  '/staff/:id/permissions',
  requirePermission(PERMISSIONS.STAFF_MANAGE),
  staffController.updatePermissions
);
router.patch('/staff/:id', requirePermission(PERMISSIONS.STAFF_MANAGE), staffController.update);
router.delete('/staff/:id', requirePermission(PERMISSIONS.STAFF_MANAGE), staffController.remove);

// ─── Applications (8.1 / 8.2) ────────────────────────────────────────────────
router.get(
  '/applications',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_READ, PERMISSIONS.APPLICATIONS_INTAKE),
  applicationController.list
);
router.get(
  '/applications/:id',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_READ, PERMISSIONS.APPLICATIONS_INTAKE),
  applicationController.getById
);
router.post(
  '/applications',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_WRITE, PERMISSIONS.APPLICATIONS_INTAKE),
  applicationController.createValidators,
  validate,
  applicationController.createManual
);
router.patch(
  '/applications/:id',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_WRITE, PERMISSIONS.APPLICATIONS_INTAKE),
  applicationController.update
);
router.patch(
  '/applications/:id/applicant',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_WRITE, PERMISSIONS.APPLICATIONS_INTAKE),
  applicationController.updateApplicant
);
router.patch(
  '/applications/:id/passport',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_WRITE, PERMISSIONS.APPLICATIONS_INTAKE),
  applicationController.updatePassport
);
router.patch(
  '/applications/:id/travel',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_WRITE, PERMISSIONS.APPLICATIONS_INTAKE),
  applicationController.updateTravel
);
router.post(
  '/applications/:id/status',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_STATUS, PERMISSIONS.APPLICATIONS_INTAKE),
  body('toStatus').notEmpty(),
  validate,
  applicationController.changeStatus
);
router.delete(
  '/applications/:id',
  requirePermission(PERMISSIONS.APPLICATIONS_WRITE),
  applicationController.remove
);
router.post(
  '/applications/:id/notes',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_WRITE, PERMISSIONS.APPLICATIONS_STATUS),
  body('note').notEmpty(),
  validate,
  applicationController.addNote
);

// ─── Document delivery (8.8) ─────────────────────────────────────────────────
router.get(
  '/applications/:id/documents',
  requirePermission(PERMISSIONS.APPLICATIONS_READ),
  documentController.listApplicationDocuments
);
router.post(
  '/applications/:id/documents/deliver',
  requireAnyPermission(PERMISSIONS.DOCUMENTS_DELIVER, PERMISSIONS.APPLICATIONS_INTAKE),
  uploadDeliveryDoc.single('file'),
  documentController.deliverDocument
);
router.post(
  '/applications/:id/documents/request',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_STATUS, PERMISSIONS.DOCUMENTS_DELIVER),
  body('documentName').optional().isString(),
  body('documentNames').optional().isArray(),
  body('note').optional().isString(),
  validate,
  documentController.requestDocuments
);
router.get(
  '/documents/:documentId/download',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_READ, PERMISSIONS.DOCUMENTS_DELIVER),
  documentController.downloadDocument
);

// ─── Receptionist lookup (8.6) ───────────────────────────────────────────────
router.get(
  '/receptionist/lookup',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_READ, PERMISSIONS.APPLICATIONS_INTAKE),
  recordsController.lookup
);

// ─── Records & export (8.7) — decision cases only ─────────────────────────────
router.get(
  '/records',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_READ, PERMISSIONS.RECORDS_EXPORT),
  recordsController.listDecisions
);
router.get(
  '/records/export',
  requirePermission(PERMISSIONS.RECORDS_EXPORT),
  recordsController.exportDecisions
);
router.get(
  '/records/summary',
  requireAnyPermission(PERMISSIONS.APPLICATIONS_READ, PERMISSIONS.RECORDS_EXPORT),
  recordsController.recordsSummary
);

// ─── Finance (8.4) ───────────────────────────────────────────────────────────
router.get('/finance/payments', requirePermission(PERMISSIONS.FINANCE_READ), financeController.listPayments);
router.post(
  '/finance/payments',
  requireAnyPermission(PERMISSIONS.FINANCE_WRITE, PERMISSIONS.APPLICATIONS_INTAKE),
  body('applicationId').notEmpty(),
  body('amount').isFloat({ gt: 0 }),
  validate,
  financeController.recordPayment
);
router.patch(
  '/finance/payments/:id/status',
  requirePermission(PERMISSIONS.FINANCE_WRITE),
  body('status').isIn(['pending', 'successful', 'failed', 'refunded', 'cancelled']),
  validate,
  financeController.updatePaymentStatus
);
router.get(
  '/finance/dashboard',
  requirePermission(PERMISSIONS.FINANCE_READ),
  financeController.revenueDashboard
);
router.get(
  '/finance/payments/export',
  requirePermission(PERMISSIONS.REPORTS_EXPORT),
  financeController.exportPaymentsCsv
);

// ─── Embassy setup (8.5) ─────────────────────────────────────────────────────
router.get('/embassies', requireAnyPermission(PERMISSIONS.EMBASSY_SETUP, PERMISSIONS.APPLICATIONS_READ), embassyController.list);
router.get('/embassies/:id', requireAnyPermission(PERMISSIONS.EMBASSY_SETUP, PERMISSIONS.APPLICATIONS_READ), embassyController.getById);
router.post('/embassies', requirePermission(PERMISSIONS.EMBASSY_SETUP), embassyController.create);
router.patch('/embassies/:id', requirePermission(PERMISSIONS.EMBASSY_SETUP), embassyController.update);
router.delete('/embassies/:id', requirePermission(PERMISSIONS.EMBASSY_SETUP), embassyController.remove);
router.get(
  '/embassies/:id/applications',
  requireAnyPermission(PERMISSIONS.EMBASSY_SETUP, PERMISSIONS.APPLICATIONS_READ),
  embassyController.applicationsForEmbassy
);

// ─── Chat (8.5) ──────────────────────────────────────────────────────────────
router.get('/chat/unread', requirePermission(PERMISSIONS.CHAT_ACCESS), chatController.unreadSummary);
router.get('/chat/rooms', requirePermission(PERMISSIONS.CHAT_ACCESS), chatController.listRooms);
router.post('/chat/rooms/application', requirePermission(PERMISSIONS.CHAT_ACCESS), chatController.ensureApplicationRoom);
router.get('/chat/rooms/:roomId/messages', requirePermission(PERMISSIONS.CHAT_ACCESS), chatController.listMessages);
router.post('/chat/rooms/:roomId/read', requirePermission(PERMISSIONS.CHAT_ACCESS), chatController.markRead);
router.post(
  '/chat/rooms/:roomId/messages',
  requirePermission(PERMISSIONS.CHAT_ACCESS),
  uploadChatAttachment.array('attachments', 5),
  body('body').notEmpty(),
  validate,
  chatController.sendMessage
);

// ─── Website content + email templates (8.3) ─────────────────────────────────
router.get('/content', requirePermission(PERMISSIONS.FEES_CONTENT_MANAGE), contentController.listContent);
router.post('/content', requirePermission(PERMISSIONS.FEES_CONTENT_MANAGE), contentController.upsertContent);
router.patch('/content/:id', requirePermission(PERMISSIONS.FEES_CONTENT_MANAGE), contentController.upsertContent);
router.delete('/content/:id', requirePermission(PERMISSIONS.FEES_CONTENT_MANAGE), contentController.deleteContent);
router.get('/email-templates', requirePermission(PERMISSIONS.SETTINGS_MANAGE), contentController.listEmailTemplates);
router.put('/email-templates', requirePermission(PERMISSIONS.SETTINGS_MANAGE), contentController.upsertEmailTemplate);

// ─── Visa config (fees/docs/fields) — PRD 8.3, JWT+RBAC ──────────────────────
function mountConfigCrud(path, controller, permission) {
  router.get(`/${path}`, requirePermission(permission), controller.list);
  router.post(`/${path}/upsert`, requirePermission(permission), controller.upsert);
  router.post(`/${path}`, requirePermission(permission), controller.create);
  router.get(`/${path}/:id`, requirePermission(permission), controller.getById);
  router.put(`/${path}/:id`, requirePermission(permission), controller.update);
  router.patch(`/${path}/:id`, requirePermission(permission), controller.update);
  router.delete(`/${path}/:id`, requirePermission(permission), controller.remove);
}

mountConfigCrud('visa-types', visaTypes, PERMISSIONS.FEES_CONTENT_MANAGE);
mountConfigCrud('eligibility-rules', eligibilityRules, PERMISSIONS.FEES_CONTENT_MANAGE);
mountConfigCrud('document-requirements', documentRequirements, PERMISSIONS.FEES_CONTENT_MANAGE);
mountConfigCrud('form-fields', formFields, PERMISSIONS.FEES_CONTENT_MANAGE);
mountConfigCrud('fee-rules', feeRules, PERMISSIONS.FEES_CONTENT_MANAGE);

// ─── Issued visas + templates (8.9 / 8.11) ───────────────────────────────────
router.get('/issued-visas', requirePermission(PERMISSIONS.VISAS_ISSUED_MANAGE), issuedVisaController.listIssued);
router.get('/issued-visas/export', requirePermission(PERMISSIONS.RECORDS_EXPORT), issuedVisaController.exportIssuedCsv);
router.post(
  '/issued-visas/preview',
  requireAnyPermission(PERMISSIONS.VISAS_ISSUED_MANAGE, PERMISSIONS.APPLICATIONS_STATUS),
  issuedVisaController.previewVisa
);
router.post('/issued-visas/issue', requirePermission(PERMISSIONS.VISAS_ISSUED_MANAGE), issuedVisaController.issueNow);
router.get('/issued-visas/:id', requirePermission(PERMISSIONS.VISAS_ISSUED_MANAGE), issuedVisaController.getIssued);
router.get('/issued-visas/:id/download', requirePermission(PERMISSIONS.VISAS_ISSUED_MANAGE), issuedVisaController.downloadIssued);

router.get('/visa-templates', requirePermission(PERMISSIONS.TEMPLATES_MANAGE), issuedVisaController.listTemplates);
router.get('/visa-templates/:id', requirePermission(PERMISSIONS.TEMPLATES_MANAGE), issuedVisaController.getTemplate);
router.put('/visa-templates', requirePermission(PERMISSIONS.TEMPLATES_MANAGE), issuedVisaController.upsertTemplate);

// ─── Settings + audit (8.10 / NFR) ───────────────────────────────────────────
router.get('/settings', requirePermission(PERMISSIONS.SETTINGS_MANAGE), settingsController.getSettings);
router.patch('/settings', requirePermission(PERMISSIONS.SETTINGS_MANAGE), settingsController.updateSettings);
router.get('/audit-logs', requirePermission(PERMISSIONS.AUDIT_READ), settingsController.listAuditLogs);

// ─── Embassy activity (9.5 — admin view of embassy-panel actions) ─────────────
router.get('/embassy-activity', requirePermission(PERMISSIONS.AUDIT_READ), embassyActivityController.list);
router.get('/embassy-activity/embassies', requirePermission(PERMISSIONS.AUDIT_READ), embassyActivityController.embassyOptions);

module.exports = router;
