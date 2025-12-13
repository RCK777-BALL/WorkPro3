// Stubbed Audit controller to replace corrupted source.
// Handlers return a 501 status until real logic is restored.

// controller methods
async function getAuditLogs(_req, res) {
  return notImplemented(res, 'getAuditLogs');
}

async function getAuditLogById(_req, res) {
  return notImplemented(res, 'getAuditLogById');
}

async function createAuditLog(_req, res) {
  return notImplemented(res, 'createAuditLog');
}

async function deleteAuditLog(_req, res) {
  return notImplemented(res, 'deleteAuditLog');
}

// shared helper
function notImplemented(res, action) {
  res.status(501).json({ success: false, message: `${action} not implemented` });
}

// exports
module.exports = {
  getAuditLogs,
  getAuditLogById,
  createAuditLog,
  deleteAuditLog,
};
