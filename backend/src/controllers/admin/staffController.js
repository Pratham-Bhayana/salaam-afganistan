const { body } = require('express-validator');
const Staff = require('../../models/Staff');
const { ROLES } = require('../../config/permissions');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const { parsePagination, escapeRegex } = require('../../utils/helpers');
const { auditFromReq } = require('../../services/auditService');

const createValidators = [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(Object.values(ROLES)),
];

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.q) {
    const q = escapeRegex(req.query.q);
    filter.$or = [
      { email: new RegExp(q, 'i') },
      { firstName: new RegExp(q, 'i') },
      { lastName: new RegExp(q, 'i') },
    ];
  }

  const [data, total] = await Promise.all([
    Staff.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Staff.countDocuments(filter),
  ]);

  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const getById = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id);
  if (!staff) throw new ApiError(404, 'Staff not found');
  return success(res, staff);
});

const create = asyncHandler(async (req, res) => {
  const exists = await Staff.findOne({ email: req.body.email.toLowerCase() });
  if (exists) throw new ApiError(409, 'Email already in use');

  const passwordHash = await Staff.hashPassword(req.body.password);
  const staff = await Staff.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email.toLowerCase(),
    phone: req.body.phone,
    designation: req.body.designation,
    role: req.body.role,
    passwordHash,
    createdBy: req.staff._id,
    isActive: req.body.isActive !== false,
  });

  await auditFromReq(req, {
    action: 'staff.create',
    resourceType: 'Staff',
    resourceId: staff._id,
    after: staff.toJSON(),
  });

  return success(res, staff, null, 201);
});

const update = asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id).select('+passwordHash');
  if (!staff) throw new ApiError(404, 'Staff not found');

  const before = staff.toJSON();
  if (req.body.firstName != null) staff.firstName = req.body.firstName;
  if (req.body.lastName != null) staff.lastName = req.body.lastName;
  if (req.body.phone != null) staff.phone = req.body.phone;
  if (req.body.designation != null) staff.designation = req.body.designation;
  if (req.body.role != null) {
    if (!Object.values(ROLES).includes(req.body.role)) {
      throw new ApiError(400, 'Invalid role');
    }
    staff.role = req.body.role;
  }
  if (req.body.isActive != null) staff.isActive = !!req.body.isActive;
  if (req.body.password) {
    staff.passwordHash = await Staff.hashPassword(req.body.password);
  }

  await staff.save();
  await auditFromReq(req, {
    action: 'staff.update',
    resourceType: 'Staff',
    resourceId: staff._id,
    before,
    after: staff.toJSON(),
  });

  return success(res, staff);
});

const remove = asyncHandler(async (req, res) => {
  if (String(req.staff._id) === String(req.params.id)) {
    throw new ApiError(400, 'You cannot deactivate your own account via this endpoint');
  }
  const staff = await Staff.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: false } },
    { new: true }
  );
  if (!staff) throw new ApiError(404, 'Staff not found');

  await auditFromReq(req, {
    action: 'staff.deactivate',
    resourceType: 'Staff',
    resourceId: staff._id,
    after: staff.toJSON(),
  });

  return success(res, staff);
});

/** PATCH /staff/:id/permissions — persist sectionOverrides on top of role defaults */
const updatePermissions = asyncHandler(async (req, res) => {
  const { sectionOverrides } = req.body;
  if (
    sectionOverrides == null ||
    typeof sectionOverrides !== 'object' ||
    Array.isArray(sectionOverrides)
  ) {
    throw new ApiError(400, 'sectionOverrides must be an object');
  }

  const staff = await Staff.findById(req.params.id);
  if (!staff) throw new ApiError(404, 'Staff not found');

  const before = staff.toJSON();
  staff.sectionOverrides = sectionOverrides;
  await staff.save();

  await auditFromReq(req, {
    action: 'staff.permissions.update',
    resourceType: 'Staff',
    resourceId: staff._id,
    before,
    after: staff.toJSON(),
  });

  return success(res, staff);
});

module.exports = {
  createValidators,
  list,
  getById,
  create,
  update,
  remove,
  updatePermissions,
};
