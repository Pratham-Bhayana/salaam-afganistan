const VisaType = require('../models/VisaType');
const EligibilityRule = require('../models/EligibilityRule');
const DocumentRequirement = require('../models/DocumentRequirement');
const FormField = require('../models/FormField');
const FeeRule = require('../models/FeeRule');
const { ApiError, asyncHandler, success } = require('../middleware/error');

function createCrudController(Model, { uniqueFilter, resourceName }) {
  return {
    list: asyncHandler(async (req, res) => {
      const filter = {};
      if (req.query.visaTypeCode) filter.visaTypeCode = req.query.visaTypeCode;
      if (req.query.channel) filter.channel = req.query.channel;
      if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

      const data = await Model.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();
      return success(res, data, { count: data.length });
    }),

    getById: asyncHandler(async (req, res) => {
      const data = await Model.findById(req.params.id).lean();
      if (!data) throw new ApiError(404, `${resourceName} not found`);
      return success(res, data);
    }),

    create: asyncHandler(async (req, res) => {
      const data = await Model.create(req.body);
      return success(res, data, null, 201);
    }),

    update: asyncHandler(async (req, res) => {
      const data = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      }).lean();
      if (!data) throw new ApiError(404, `${resourceName} not found`);
      return success(res, data);
    }),

    remove: asyncHandler(async (req, res) => {
      const data = await Model.findByIdAndDelete(req.params.id).lean();
      if (!data) throw new ApiError(404, `${resourceName} not found`);
      return success(res, { deleted: true, id: req.params.id });
    }),

    upsert: asyncHandler(async (req, res) => {
      if (!uniqueFilter) {
        throw new ApiError(400, 'Upsert is not supported for this resource');
      }
      const filter = uniqueFilter(req.body);
      const data = await Model.findOneAndUpdate(filter, { $set: req.body }, {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }).lean();
      return success(res, data);
    }),
  };
}

const visaTypes = createCrudController(VisaType, {
  resourceName: 'Visa type',
  uniqueFilter: (body) => ({ code: body.code }),
});

const eligibilityRules = createCrudController(EligibilityRule, {
  resourceName: 'Eligibility rule',
  uniqueFilter: (body) => ({ visaTypeCode: body.visaTypeCode }),
});

const documentRequirements = createCrudController(DocumentRequirement, {
  resourceName: 'Document requirement',
  uniqueFilter: (body) => ({ visaTypeCode: body.visaTypeCode, key: body.key }),
});

const formFields = createCrudController(FormField, {
  resourceName: 'Form field',
  uniqueFilter: (body) => ({ visaTypeCode: body.visaTypeCode, key: body.key }),
});

const feeRules = createCrudController(FeeRule, {
  resourceName: 'Fee rule',
  uniqueFilter: (body) => ({
    visaTypeCode: body.visaTypeCode,
    nationality: body.nationality,
    processing: body.processing,
    stage: body.stage,
  }),
});

module.exports = {
  visaTypes,
  eligibilityRules,
  documentRequirements,
  formFields,
  feeRules,
};
