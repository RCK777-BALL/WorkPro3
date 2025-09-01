import { Request, Response, NextFunction } from 'express';

// Middleware to ensure the authenticated user has one of the required roles
export const requireRole = (
  ...roles: Array<'admin' | 'manager' | 'technician' | 'viewer'>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role as any)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };
};

export default requireRole;
