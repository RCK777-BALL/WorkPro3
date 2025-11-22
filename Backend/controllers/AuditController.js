// Stubbed Audit controller to replace corrupted source.
// Handlers return a 501 status until real logic is restored.

const notImplemented = (res, action) => {
  res.status(501).json({ success: false, message: `${action} not implemented` });
};

const getAuditLogs = (_req, res) => notImplemented(res, 'getAuditLogs');
const getAuditLogById = (_req, res) => notImplemented(res, 'getAuditLogById');
const createAuditLog = (_req, res) => notImplemented(res, 'createAuditLog');
const deleteAuditLog = (_req, res) => notImplemented(res, 'deleteAuditLog');

module.exports = {
  getAuditLogs,
  getAuditLogById,
  createAuditLog,
  deleteAuditLog,
};
