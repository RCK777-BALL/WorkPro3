import jwt from 'jsonwebtoken';
import Vendor from '../models/Vendor';
/**
 * Authenticate vendor requests using a Bearer JWT.
 * - Verifies token with VENDOR_JWT_SECRET (fallback: JWT_SECRET)
 * - Loads the vendor document
 * - Attaches `req.vendor` and `req.vendorId`
 */
export const requireVendorAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const token = authHeader.slice(7).trim();
        const secret = process.env.VENDOR_JWT_SECRET || process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({ message: 'Server configuration issue' });
            return;
        }
        const { id } = jwt.verify(token, secret);
        const vendor = await Vendor.findById(id).lean();
        if (!vendor) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        req.vendor = vendor;
        req.vendorId = vendor._id?.toString?.() ?? id;
        next();
    }
    catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};
// Backwards-compatible alias for older imports
export const requireVendorToken = requireVendorAuth;
export default { requireVendorAuth };
