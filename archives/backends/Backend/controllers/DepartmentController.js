// Department controller stub for stable builds.

// controller methods
async function getAllDepartments(_req, res) {
  return notImplemented(res, 'getAllDepartments');
}

async function getDepartmentById(_req, res) {
  return notImplemented(res, 'getDepartmentById');
}

async function createDepartment(_req, res) {
  return notImplemented(res, 'createDepartment');
}

async function updateDepartment(_req, res) {
  return notImplemented(res, 'updateDepartment');
}

async function deleteDepartment(_req, res) {
  return notImplemented(res, 'deleteDepartment');
}

// shared helper
function notImplemented(res, action) {
  res.status(501).json({ success: false, message: `${action} not implemented` });
}

// exports
module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
