// Dashboard controller stubs to ensure syntactic integrity.

const notImplemented = (res, action) => {
  res.status(501).json({ success: false, message: `${action} not implemented` });
};

const getDashboardOverview = (_req, res) => notImplemented(res, 'getDashboardOverview');
const getDashboardLivePulse = (_req, res) => notImplemented(res, 'getDashboardLivePulse');
const getDashboardWorkOrders = (_req, res) => notImplemented(res, 'getDashboardWorkOrders');
const getDashboardRecentActivity = (_req, res) =>
  notImplemented(res, 'getDashboardRecentActivity');
const getDashboardPermits = (_req, res) => notImplemented(res, 'getDashboardPermits');
const getDashboardExportPdf = (_req, res) => notImplemented(res, 'getDashboardExportPdf');
const postDashboardImportSync = (_req, res) => notImplemented(res, 'postDashboardImportSync');
const postLaunchPlanner = (_req, res) => notImplemented(res, 'postLaunchPlanner');

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
