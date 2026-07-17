const { asyncHandler, success } = require('../../middleware/error');
const {
  listDecisionRecords,
  exportDecisionRecords,
} = require('../../services/decisionRecordsService');

const listDecisions = asyncHandler(async (req, res) => {
  const { data, meta } = await listDecisionRecords(req.query, {
    embassyOnly: true,
    embassyId: req.embassyId,
  });
  return success(res, data, meta);
});

const exportDecisions = asyncHandler(async (req, res) => {
  const csv = await exportDecisionRecords(req.query, {
    embassyOnly: true,
    embassyId: req.embassyId,
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="embassy-decision-records.csv"');
  return res.status(200).send(csv);
});

module.exports = {
  listDecisions,
  exportDecisions,
};
