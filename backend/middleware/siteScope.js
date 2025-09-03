// Middleware to capture x-site-id header and attach to request
const siteScope = (req, _res, next) => {
    const siteId = req.header('x-site-id');
    if (siteId) {
        req.siteId = siteId;
    }
    next();
};
export default siteScope;
