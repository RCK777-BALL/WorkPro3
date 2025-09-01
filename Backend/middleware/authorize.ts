import { RequestHandler } from 'express';

/**
 * Factory for permission-based authorization middleware.
 * Ensures the authenticated user has all required permissions
 * before allowing the request to proceed.
 */
export const authorize = (...required: string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userPerms = req.user.permissions || [];
    const hasPerm = required.every((p) => userPerms.includes(p));
    if (!hasPerm) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    next();
  };
};

export default authorize;
