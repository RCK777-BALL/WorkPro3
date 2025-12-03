// Dashboard controller stubs to ensure syntactic integrity.

// controller methods
async function getDashboardOverview(_req, res) {
  return notImplemented(res, 'getDashboardOverview');
}

async function getDashboardLivePulse(_req, res) {
  return notImplemented(res, 'getDashboardLivePulse');
}

async function getDashboardWorkOrders(_req, res) {
  return notImplemented(res, 'getDashboardWorkOrders');
}

async function getDashboardRecentActivity(_req, res) {
  return notImplemented(res, 'getDashboardRecentActivity');
}

async function getDashboardPermits(_req, res) {
  return notImplemented(res, 'getDashboardPermits');
}

async function getDashboardExportPdf(_req, res) {
  return notImplemented(res, 'getDashboardExportPdf');
}

async function postDashboardImportSync(_req, res) {
  return notImplemented(res, 'postDashboardImportSync');
}

async function postLaunchPlanner(_req, res) {
  return notImplemented(res, 'postLaunchPlanner');
}

// shared helper
function notImplemented(res, action) {
  res.status(501).json({ success: false, message: `${action} not implemented` });
}

// exports
module.exports = {
  getDashboardOverview,
  getDashboardLivePulse,
  getDashboardWorkOrders,
  getDashboardRecentActivity,
  getDashboardPermits,
  getDashboardExportPdf,
  postDashboardImportSync,
  postLaunchPlanner,
};
