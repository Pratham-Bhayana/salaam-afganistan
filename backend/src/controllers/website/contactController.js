const { body } = require('express-validator');
const ContactEnquiry = require('../../models/ContactEnquiry');
const { asyncHandler, success } = require('../../middleware/error');

const submitValidators = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }).withMessage('Phone is too long'),
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 180 }),
  body('message')
    .trim()
    .isLength({ min: 10, max: 4000 })
    .withMessage('Message should be between 10 and 4000 characters'),
];

const submit = asyncHandler(async (req, res) => {
  const enquiry = await ContactEnquiry.create({
    name: req.body.name.trim(),
    email: req.body.email.trim().toLowerCase(),
    phone: (req.body.phone || '').trim(),
    subject: req.body.subject.trim(),
    message: req.body.message.trim(),
    source: 'website',
    ip: req.ip,
  });

  return success(
    res,
    {
      id: enquiry._id,
      name: enquiry.name,
      email: enquiry.email,
    },
    null,
    201
  );
});

module.exports = {
  submitValidators,
  submit,
};
