const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');

const { validate } = require('../../middleware/validate');
const { authenticateApplicant } = require('../../middleware/websiteAuth');
const { uploadApplicationDoc } = require('../../middleware/upload');

const authController = require('../../controllers/website/authController');
const profileController = require('../../controllers/website/profileController');
const applicationController = require('../../controllers/website/applicationController');
const documentController = require('../../controllers/website/documentController');
const notificationController = require('../../controllers/website/notificationController');
const paymentController = require('../../controllers/website/paymentController');
const dashboardController = require('../../controllers/website/dashboardController');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, try again later' },
});

// ─── Auth (Firebase Google / Email / Phone on client → idToken here) ─────────
router.post(
  '/auth/firebase',
  authLimiter,
  authController.firebaseLoginValidators,
  validate,
  authController.firebaseLogin
);
router.post(
  '/auth/refresh',
  authLimiter,
  body('refreshToken').notEmpty(),
  validate,
  authController.refresh
);

router.use(authenticateApplicant);

router.post('/auth/logout', authController.logout);
router.get('/auth/me', authController.me);

// ─── Profile / dashboard ─────────────────────────────────────────────────────
router.get('/dashboard', dashboardController.dashboard);
router.get('/profile', profileController.getProfile);
router.patch('/profile', profileController.updateProfile);

// ─── Applications ────────────────────────────────────────────────────────────
router.get('/applications', applicationController.listMine);
router.post(
  '/applications',
  applicationController.createValidators,
  validate,
  applicationController.createDraft
);
router.get('/applications/:id', applicationController.getMine);
router.patch('/applications/:id', applicationController.updateDraft);
router.post('/applications/:id/submit', applicationController.submit);

// ─── Documents ───────────────────────────────────────────────────────────────
router.get('/applications/:id/documents', documentController.listDocuments);
router.post(
  '/applications/:id/documents',
  uploadApplicationDoc.single('file'),
  documentController.uploadDocument
);
router.get(
  '/applications/:id/documents/:documentId/download',
  documentController.downloadDocument
);
router.get('/applications/:id/visa/download', documentController.downloadIssuedVisa);

// ─── Payments (stub) ─────────────────────────────────────────────────────────
router.get('/applications/:id/fees', paymentController.quoteFees);
router.post('/applications/:id/payments', paymentController.initiatePayment);
router.post(
  '/applications/:id/payments/:paymentId/confirm',
  paymentController.confirmPayment
);

// ─── Notifications ───────────────────────────────────────────────────────────
router.get('/notifications', notificationController.list);
router.post('/notifications/read-all', notificationController.markAllRead);
router.post('/notifications/:id/read', notificationController.markRead);

module.exports = router;
