// Clean stub controller generated to resolve prior syntax issues.
// Each handler responds with a 501 Not Implemented status.

// controller methods
async function getAllAssets(_req, res) {
  return notImplemented(res, 'getAllAssets');
}

async function getAssetById(_req, res) {
  return notImplemented(res, 'getAssetById');
}

async function createAsset(_req, res) {
  return notImplemented(res, 'createAsset');
}

async function updateAsset(_req, res) {
  return notImplemented(res, 'updateAsset');
}

async function deleteAsset(_req, res) {
  return notImplemented(res, 'deleteAsset');
}

async function searchAssets(_req, res) {
  return notImplemented(res, 'searchAssets');
}

async function getAssetTree(_req, res) {
  return notImplemented(res, 'getAssetTree');
}

// shared helper
function notImplemented(res, action) {
  res.status(501).json({ success: false, message: `${action} not implemented` });
}

// exports
module.exports = {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  searchAssets,
  getAssetTree,
};
