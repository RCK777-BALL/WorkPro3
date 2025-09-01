import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface VendorPayload { id: string }

export const requireVendorToken = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const token = authHeader.substring(7);
  try {
    const secret = process.env.VENDOR_JWT_SECRET || process.env.JWT_SECRET;
    const payload = jwt.verify(token, secret!) as VendorPayload;
    (req as any).vendorId = payload.id;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export default { requireVendorToken };
