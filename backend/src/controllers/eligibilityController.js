const EligibilityRule = require('../models/EligibilityRule');
const VisaType = require('../models/VisaType');
const { ApiError, asyncHandler, success } = require('../middleware/error');

/**
 * POST body: { nationality, residence, visaTypeCode? }
 * If visaTypeCode omitted, checks all active visa types.
 */
const checkEligibility = asyncHandler(async (req, res) => {
  const nationality = String(req.body.nationality || '').toUpperCase().trim();
  const residence = String(req.body.residence || '').toUpperCase().trim();
  const visaTypeCode = req.body.visaTypeCode ? String(req.body.visaTypeCode).trim() : null;

  if (!nationality || !residence) {
    throw new ApiError(400, 'nationality and residence are required (ISO country codes)');
  }

  let rules;
  if (visaTypeCode) {
    const rule = await EligibilityRule.findOne({ visaTypeCode }).lean();
    if (!rule) throw new ApiError(404, `No eligibility rule for visa type: ${visaTypeCode}`);
    rules = [rule];
  } else {
    const activeTypes = await VisaType.find({ isActive: true }).select('code').lean();
    const codes = activeTypes.map((t) => t.code);
    rules = await EligibilityRule.find({ visaTypeCode: { $in: codes } }).lean();
  }

  const results = rules.map((rule) => {
    const hardRefused = (rule.hardRefuseNationalities || []).includes(nationality);
    const nationalityBlocked = (rule.blockedNationalities || []).includes(nationality);
    const residenceBlocked = (rule.blockedResidences || []).includes(residence);

    let eligible = true;
    let reason = 'Eligible';

    if (hardRefused) {
      eligible = false;
      reason = 'Nationality is hard-refused for this visa category';
    } else if (nationalityBlocked) {
      eligible = false;
      reason = 'Nationality is not eligible for this visa channel';
    } else if (residenceBlocked) {
      eligible = false;
      reason = 'Country of residence is not eligible for this visa channel';
    }

    return {
      visaTypeCode: rule.visaTypeCode,
      eligible,
      reason,
      checks: {
        nationality,
        residence,
        hardRefused,
        nationalityBlocked,
        residenceBlocked,
      },
    };
  });

  return success(res, {
    nationality,
    residence,
    results,
    eligibleVisaTypeCodes: results.filter((r) => r.eligible).map((r) => r.visaTypeCode),
  });
});

module.exports = { checkEligibility };
