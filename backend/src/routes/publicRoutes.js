const express = require('express');
const {
  listVisaTypes,
  getVisaTypeByCode,
  getDocuments,
  getFormFields,
  getFees,
} = require('../controllers/publicVisaController');
const { checkEligibility } = require('../controllers/eligibilityController');

const router = express.Router();

router.get('/visa-types', listVisaTypes);
router.get('/visa-types/:code', getVisaTypeByCode);
router.get('/visa-types/:code/documents', getDocuments);
router.get('/visa-types/:code/form-fields', getFormFields);
router.get('/visa-types/:code/fees', getFees);
router.post('/eligibility/check', checkEligibility);

module.exports = router;
