// Document controller stub ensuring clean exports.

// controller methods
async function getAllDocuments(_req, res) {
  return notImplemented(res, 'getAllDocuments');
}

async function getDocumentById(_req, res) {
  return notImplemented(res, 'getDocumentById');
}

async function createDocument(_req, res) {
  return notImplemented(res, 'createDocument');
}

async function updateDocument(_req, res) {
  return notImplemented(res, 'updateDocument');
}

async function deleteDocument(_req, res) {
  return notImplemented(res, 'deleteDocument');
}

// shared helper
function notImplemented(res, action) {
  res.status(501).json({ success: false, message: `${action} not implemented` });
}

// exports
module.exports = {
  getAllDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
};
