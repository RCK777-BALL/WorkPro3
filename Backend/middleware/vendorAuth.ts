import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import Vendor from '../models/Vendor';

interface VendorTokenPayload {
  id: string;
}

/**
 * Middleware to authenticate vendor requests using a JWT token.
 * The token should be provided in the `Authorization` header as
 * a Bearer token. On success, the vendor document and `vendorId`
 * are attached to the request object.
 */
export const requireVendorAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.VENDOR_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ message: 'Server configuration issue' });
      return;
    }

    const { id } = jwt.verify(token, secret) as VendorTokenPayload;
    const vendor = await Vendor.findById(id).lean();
    if (!vendor) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    (req as any).vendor = vendor;
    (req as any).vendorId = vendor._id.toString();
    next();
  } catch (_err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export default { requireVendorAuth };
