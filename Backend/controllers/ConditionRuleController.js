// Condition rule controller stubs with a single CommonJS export.

const notImplemented = (res, action) => {
  res.status(501).json({ success: false, message: `${action} not implemented` });
};

const getAllConditionRules = (_req, res) => notImplemented(res, 'getAllConditionRules');
const getConditionRuleById = (_req, res) => notImplemented(res, 'getConditionRuleById');
const createConditionRule = (_req, res) => notImplemented(res, 'createConditionRule');
const updateConditionRule = (_req, res) => notImplemented(res, 'updateConditionRule');
const deleteConditionRule = (_req, res) => notImplemented(res, 'deleteConditionRule');

module.exports = {
  getAllConditionRules,
  getConditionRuleById,
  createConditionRule,
  updateConditionRule,
  deleteConditionRule,
};
