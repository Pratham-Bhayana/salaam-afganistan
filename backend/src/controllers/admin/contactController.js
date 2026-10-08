const { body } = require('express-validator');
const ContactEnquiry = require('../../models/ContactEnquiry');
const { asyncHandler, success, ApiError } = require('../../middleware/error');
const { parsePagination } = require('../../utils/helpers');

const STATUSES = ['new', 'read', 'archived'];

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.query.status && STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const q = String(req.query.q || '').trim();
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { subject: pattern }, { phone: pattern }];
  }

  const [data, total, newCount] = await Promise.all([
    ContactEnquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ContactEnquiry.countDocuments(filter),
    ContactEnquiry.countDocuments({ status: 'new' }),
  ]);

  return success(res, data, {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
    newCount,
  });
});

const getById = asyncHandler(async (req, res) => {
  const enquiry = await ContactEnquiry.findById(req.params.id);
  if (!enquiry) throw new ApiError(404, 'Contact enquiry not found');

  if (enquiry.status === 'new') {
    enquiry.status = 'read';
    await enquiry.save();
  }

  return success(res, enquiry);
});

const updateStatusValidators = [
  body('status').isIn(STATUSES).withMessage('Status must be new, read, or archived'),
];

const updateStatus = asyncHandler(async (req, res) => {
  const enquiry = await ContactEnquiry.findById(req.params.id);
  if (!enquiry) throw new ApiError(404, 'Contact enquiry not found');

  enquiry.status = req.body.status;
  await enquiry.save();
  return success(res, enquiry);
});

module.exports = {
  list,
  getById,
  updateStatusValidators,
  updateStatus,
};
