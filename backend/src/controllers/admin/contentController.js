const WebsiteContent = require('../../models/WebsiteContent');
const EmailTemplate = require('../../models/EmailTemplate');
const { ApiError, asyncHandler, success } = require('../../middleware/error');
const { parsePagination } = require('../../utils/helpers');
const { auditFromReq } = require('../../services/auditService');

const listContent = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.isPublished !== undefined) filter.isPublished = req.query.isPublished === 'true';

  const [data, total] = await Promise.all([
    WebsiteContent.find(filter).sort({ sortOrder: 1, updatedAt: -1 }).skip(skip).limit(limit),
    WebsiteContent.countDocuments(filter),
  ]);
  return success(res, data, { page, limit, total, pages: Math.ceil(total / limit) });
});

const upsertContent = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    updatedBy: req.staff._id,
  };

  let doc;
  if (req.params.id) {
    doc = await WebsiteContent.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!doc) throw new ApiError(404, 'Content not found');
  } else {
    doc = await WebsiteContent.create(payload);
  }

  await auditFromReq(req, {
    action: req.params.id ? 'content.update' : 'content.create',
    resourceType: 'WebsiteContent',
    resourceId: doc._id,
    after: doc.toObject(),
  });

  return success(res, doc, null, req.params.id ? 200 : 201);
});

const deleteContent = asyncHandler(async (req, res) => {
  const doc = await WebsiteContent.findByIdAndDelete(req.params.id);
  if (!doc) throw new ApiError(404, 'Content not found');
  return success(res, { deleted: true, id: req.params.id });
});

const listEmailTemplates = asyncHandler(async (req, res) => {
  const data = await EmailTemplate.find().sort({ code: 1 });
  return success(res, data, { count: data.length });
});

const upsertEmailTemplate = asyncHandler(async (req, res) => {
  const doc = await EmailTemplate.findOneAndUpdate(
    { code: req.body.code },
    { $set: { ...req.body, updatedBy: req.staff._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  await auditFromReq(req, {
    action: 'email_template.upsert',
    resourceType: 'EmailTemplate',
    resourceId: doc._id,
    after: doc.toObject(),
  });

  return success(res, doc);
});

module.exports = {
  listContent,
  upsertContent,
  deleteContent,
  listEmailTemplates,
  upsertEmailTemplate,
};
