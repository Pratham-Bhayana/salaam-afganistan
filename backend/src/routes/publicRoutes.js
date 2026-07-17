const express = require('express');
const {
  listVisaTypes,
  getVisaTypeByCode,
  getDocuments,
  getFormFields,
  getFees,
} = require('../controllers/publicVisaController');
const { checkEligibility } = require('../controllers/eligibilityController');
const { verifyVisa, verifyVisaInfo } = require('../controllers/publicVisaVerifyController');

const router = express.Router();

router.get('/visa-types', listVisaTypes);
router.get('/visa-types/:code', getVisaTypeByCode);
router.get('/visa-types/:code/documents', getDocuments);
router.get('/visa-types/:code/form-fields', getFormFields);
router.get('/visa-types/:code/fees', getFees);
router.post('/eligibility/check', checkEligibility);

// Issued eVISA QR / barcode scan → open PDF
router.get('/visas/verify/:token', verifyVisa);
router.get('/visas/verify/:token/info', verifyVisaInfo);

module.exports = router;
