// Condition rule controller stubs with a single CommonJS export.

// controller methods
async function getAllConditionRules(_req, res) {
  return notImplemented(res, 'getAllConditionRules');
}

async function getConditionRuleById(_req, res) {
  return notImplemented(res, 'getConditionRuleById');
}

async function createConditionRule(_req, res) {
  return notImplemented(res, 'createConditionRule');
}

async function updateConditionRule(_req, res) {
  return notImplemented(res, 'updateConditionRule');
}

async function deleteConditionRule(_req, res) {
  return notImplemented(res, 'deleteConditionRule');
}

// shared helper
function notImplemented(res, action) {
  res.status(501).json({ success: false, message: `${action} not implemented` });
}

// exports
module.exports = {
  getAllConditionRules,
  getConditionRuleById,
  createConditionRule,
  updateConditionRule,
  deleteConditionRule,
};
