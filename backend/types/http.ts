import { Request, Response, NextFunction } from 'express';

export type Role = 'admin' | 'manager' | 'technician' | 'viewer';

export type RequestUser = {
  id?: string;
  _id?: string;
  email?: string;
  role?: Role;
  tenantId?: string; // <-- added so req.user.tenantId is typed
  // UI preferences used by ThemeController
  theme?: 'light' | 'dark' | 'system';
  colorScheme?: string;
};

export type AuthedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
  Request<P, ResBody, ReqBody, ReqQuery> & {
    user?: RequestUser;
    tenantId?: string; // app-level augmentation on Request
    siteId?: string;   // optional, if you reference req.siteId elsewhere
  };

/** Allow common Express patterns like `return res.json(...)` */
export type AuthedRequestHandler<P = any, ResBody = any, ReqBody = any, ReqQuery = any> =
  (
    req: AuthedRequest<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => void | Response<any> | Promise<void | Response<any>>;
