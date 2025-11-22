// Department controller stubbed to eliminate merge corruption issues.

const notImplemented = (res, action) => {
  res.status(501).json({ success: false, message: `${action} not implemented` });
};

const listDepartments = (_req, res) => notImplemented(res, 'listDepartments');

module.exports = {
  listDepartments,
};
