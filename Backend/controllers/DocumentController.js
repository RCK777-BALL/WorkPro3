// Document controller stubbed to provide clean syntax and a single export block.

const notImplemented = (res, action) => {
  res.status(501).json({ success: false, message: `${action} not implemented` });
};

const getAllDocuments = (_req, res) => notImplemented(res, 'getAllDocuments');
const getDocumentById = (_req, res) => notImplemented(res, 'getDocumentById');
const createDocument = (_req, res) => notImplemented(res, 'createDocument');
const updateDocument = (_req, res) => notImplemented(res, 'updateDocument');
const deleteDocument = (_req, res) => notImplemented(res, 'deleteDocument');

module.exports = {
  getAllDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
};
