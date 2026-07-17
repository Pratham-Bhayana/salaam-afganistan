const path = require('path');
const fs = require('fs');
const IssuedVisa = require('../models/IssuedVisa');
const { ApiError, asyncHandler, success } = require('../middleware/error');
const { uploadRoot } = require('../middleware/upload');

/**
 * Public verify / download — QR codes on issued visas point here.
 * Scanning opens the PDF inline in the browser / phone camera apps.
 */
const verifyVisa = asyncHandler(async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token || token.startsWith('preview-')) {
    throw new ApiError(404, 'Visa not found or preview QR is not active');
  }

  const visa = await IssuedVisa.findOne({ verificationToken: token });
  if (!visa) throw new ApiError(404, 'Visa not found');

  const absolute = path.join(uploadRoot, visa.storagePath);
  if (!fs.existsSync(absolute)) throw new ApiError(404, 'Visa PDF missing on storage');

  const download = String(req.query.download || '') === '1' || String(req.query.download || '') === 'true';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${download ? 'attachment' : 'inline'}; filename="${visa.visaNumber}.pdf"`
  );
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('X-Visa-Number', visa.visaNumber);
  res.setHeader('X-Visa-Reference-Id', visa.referenceId || '');
  return fs.createReadStream(absolute).pipe(res);
});

const verifyVisaInfo = asyncHandler(async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token || token.startsWith('preview-')) {
    throw new ApiError(404, 'Visa not found or preview QR is not active');
  }

  const visa = await IssuedVisa.findOne({ verificationToken: token }).lean();
  if (!visa) throw new ApiError(404, 'Visa not found');

  return success(res, {
    visaNumber: visa.visaNumber,
    referenceId: visa.referenceId,
    applicantName: visa.applicantName,
    nationality: visa.nationality,
    passportNumber: visa.passportNumber,
    visaTypeCode: visa.visaTypeCode,
    validFrom: visa.validFrom,
    validUntil: visa.validUntil,
    issuedAt: visa.issuedAt,
    pdfUrl: `/api/v1/visas/verify/${token}`,
  });
});

module.exports = {
  verifyVisa,
  verifyVisaInfo,
};
