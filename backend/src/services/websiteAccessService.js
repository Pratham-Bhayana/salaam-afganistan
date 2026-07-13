const Application = require('../models/Application');
const { ApiError } = require('../middleware/error');

async function assertOwnApplication(req, id) {
  const application = await Application.findOne({
    _id: id,
    applicant: req.applicant._id,
  });
  if (!application) throw new ApiError(404, 'Application not found');
  return application;
}

module.exports = { assertOwnApplication };
