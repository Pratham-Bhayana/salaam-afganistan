const Application = require('../models/Application');
const { ApiError } = require('../middleware/error');
const { buildDateRangeFilter, escapeRegex } = require('../utils/helpers');
const { EMBASSY_ROLES } = require('../config/embassyPermissions');
const { APPLICATION_STATUSES } = require('../config/statusWorkflow');

function buildEmbassyApplicationFilter(req, query = {}) {
  const filter = {
    embassy: req.embassyId,
    isArchived: query.includeArchived === 'true' ? { $in: [true, false] } : false,
  };

  if (
    req.embassyStaff.role === EMBASSY_ROLES.EMBASSY_STAFF &&
    req.embassyStaff.accessMode === 'assigned'
  ) {
    filter.assignedEmbassyStaff = req.embassyStaff._id;
  }

  if (query.status) filter.status = query.status;
  if (query.visaTypeCode) filter.visaTypeCode = query.visaTypeCode;
  if (query.assignedEmbassyStaff) filter.assignedEmbassyStaff = query.assignedEmbassyStaff;
  if (query.inbox === 'active') {
    filter.status = {
      $in: [
        APPLICATION_STATUSES.SENT_TO_EMBASSY,
        APPLICATION_STATUSES.UNDER_EMBASSY_REVIEW,
        APPLICATION_STATUSES.DOCUMENTS_REQUIRED,
      ],
    };
  }

  Object.assign(filter, buildDateRangeFilter(query, query.dateField || 'updatedAt'));

  if (query.q) {
    const q = escapeRegex(query.q);
    filter.$or = [
      { referenceId: new RegExp(q, 'i') },
      { 'personal.fullName': new RegExp(q, 'i') },
      { 'personal.email': new RegExp(q, 'i') },
      { 'passport.passportNumber': new RegExp(q, 'i') },
    ];
  }

  return filter;
}

async function assertEmbassyApplicationAccess(req, applicationId) {
  const filter = buildEmbassyApplicationFilter(req, { includeArchived: 'true' });
  filter._id = applicationId;
  const application = await Application.findOne(filter);
  if (!application) {
    throw new ApiError(404, 'Application not found in your embassy scope');
  }
  return application;
}

module.exports = {
  buildEmbassyApplicationFilter,
  assertEmbassyApplicationAccess,
};
