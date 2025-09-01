import { RequestHandler } from 'express';

// Middleware to capture x-site-id header and attach to request
const siteScope: RequestHandler = (req, _res, next) => {
  const siteId = req.header('x-site-id');
  if (siteId) {
    (req as any).siteId = siteId;
  }
  next();
};

export default siteScope;
