// backend/types/express-augments.d.ts

export type RequestUser = {
  id: string;
  email?: string;
  tenantId?: string;
  siteId?: string;
  roles?: string[];
};

declare global {
  namespace Express {
    // Make passport’s Express.User carry your fields
    interface User extends RequestUser {}

    interface Request {
      // IMPORTANT: must be 'User' (from the line above), not 'RequestUser'
      user?: User;
      tenantId?: string;
      siteId?: string;
      vendorId?: string;
      // Must be 'any' to match an existing declaration elsewhere
      thirdParty?: any;
    }
  }
}

export {};
