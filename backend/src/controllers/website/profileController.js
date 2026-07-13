const Applicant = require('../../models/Applicant');
const { asyncHandler, success, ApiError } = require('../../middleware/error');

const getProfile = asyncHandler(async (req, res) => {
  return success(res, req.applicant.toJSON());
});

const updateProfile = asyncHandler(async (req, res) => {
  const applicant = req.applicant;
  const fields = [
    'firstName',
    'lastName',
    'displayName',
    'nationality',
    'countryOfResidence',
    'dateOfBirth',
    'sex',
    'address',
  ];

  fields.forEach((f) => {
    if (req.body[f] !== undefined) applicant[f] = req.body[f];
  });

  // Phone/email changes should come from Firebase re-auth + /auth/firebase re-sync.
  // Allow setting only if currently empty (complete profile after phone-only signup).
  if (!applicant.email && req.body.email) {
    const exists = await Applicant.findOne({
      email: String(req.body.email).toLowerCase(),
      _id: { $ne: applicant._id },
    });
    if (exists) throw new ApiError(409, 'Email already in use');
    applicant.email = String(req.body.email).toLowerCase();
  }
  if (!applicant.phone && req.body.phone) {
    const exists = await Applicant.findOne({
      phone: req.body.phone,
      _id: { $ne: applicant._id },
    });
    if (exists) throw new ApiError(409, 'Phone already in use');
    applicant.phone = req.body.phone;
  }

  if (req.body.nationality) {
    applicant.nationality = String(req.body.nationality).toUpperCase();
  }
  if (req.body.countryOfResidence) {
    applicant.countryOfResidence = String(req.body.countryOfResidence).toUpperCase();
  }

  await applicant.save();
  return success(res, applicant.toJSON());
});

module.exports = {
  getProfile,
  updateProfile,
};
