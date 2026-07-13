const Payment = require('../../models/Payment');
const FeeRule = require('../../models/FeeRule');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const { assertOwnApplication } = require('../../services/websiteAccessService');
const { generateReferenceId } = require('../../utils/helpers');

/**
 * Stub payment flow — records a pending/successful payment against an application.
 * Replace provider hooks (Stripe etc.) later without changing FE contract much.
 */
const quoteFees = asyncHandler(async (req, res) => {
  const application = await assertOwnApplication(req, req.params.id);
  const nationality = (application.personal?.nationality || 'ALL').toUpperCase();
  const processing = application.travel?.processingSpeed || 'standard';

  const rules = await FeeRule.find({
    visaTypeCode: application.visaTypeCode,
    isActive: true,
    processing: { $in: [processing, 'flat'] },
  }).lean();

  const pick = (stage) => {
    const specific = rules.find((r) => r.stage === stage && r.nationality === nationality);
    const fallback = rules.find((r) => r.stage === stage && r.nationality === 'ALL');
    return specific || fallback || null;
  };

  return success(res, {
    applicationId: application._id,
    referenceId: application.referenceId,
    currency: 'USD',
    processing,
    nationality,
    fees: {
      initial: pick('initial'),
      remainder: pick('remainder'),
      flat: pick('flat'),
    },
  });
});

const initiatePayment = asyncHandler(async (req, res) => {
  const application = await assertOwnApplication(req, req.params.id);
  const amount = Number(req.body.amount);
  if (!amount || amount <= 0) throw new ApiError(400, 'Valid amount is required');

  const payment = await Payment.create({
    application: application._id,
    referenceId: generateReferenceId('PAY'),
    provider: req.body.provider || 'stub',
    stage: req.body.stage || 'flat',
    currency: (req.body.currency || 'USD').toUpperCase(),
    amount,
    status: 'pending',
    visaTypeCode: application.visaTypeCode,
    embassy: application.embassy,
    nationality: application.personal?.nationality,
    processing: application.travel?.processingSpeed || 'standard',
    notes: req.body.notes || 'Website stub payment initiated',
  });

  application.paymentStatus = 'pending';
  await application.save();

  return success(
    res,
    {
      payment,
      // Placeholder for future Stripe clientSecret / redirect URL
      next: {
        type: 'stub_confirm',
        confirmUrl: `/api/v1/website/applications/${application._id}/payments/${payment._id}/confirm`,
      },
    },
    null,
    201
  );
});

const confirmPayment = asyncHandler(async (req, res) => {
  const application = await assertOwnApplication(req, req.params.id);
  const payment = await Payment.findOne({
    _id: req.params.paymentId,
    application: application._id,
  });
  if (!payment) throw new ApiError(404, 'Payment not found');

  payment.status = req.body.status === 'failed' ? 'failed' : 'successful';
  payment.providerPaymentId = req.body.providerPaymentId || `stub_${Date.now()}`;
  if (payment.status === 'successful') payment.paidAt = new Date();
  if (payment.status === 'failed') payment.failureReason = req.body.failureReason || 'Stub failure';
  await payment.save();

  application.paymentStatus =
    payment.status === 'successful' ? 'paid' : payment.status === 'failed' ? 'failed' : application.paymentStatus;
  await application.save();

  return success(res, { payment, applicationPaymentStatus: application.paymentStatus });
});

module.exports = {
  quoteFees,
  initiatePayment,
  confirmPayment,
};
