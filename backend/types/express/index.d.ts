export type RequestUser = {
  id: string;
  _id?: string;
  email?: string;
  role?: string;
};

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user details. Optional on the base Request and
       * populated by the authentication middleware.
       */
      user?: RequestUser;

      /**
       * Tenant identifier for the request. Optional globally and becomes
       * required when using {@link AuthedRequest}.
       */
      tenantId?: string;

      /**
       * Optional site identifier supplied by siteScope middleware.
       */
      siteId?: string;

      thirdParty?: any;
    }
  }
}
