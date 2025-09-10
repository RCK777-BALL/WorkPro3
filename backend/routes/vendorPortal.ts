import express, { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthedRequest } from '../types/express';

import Vendor from '../models/Vendor';
import PurchaseOrder from '../models/PurchaseOrder';
import { requireVendorAuth } from '../middleware/vendorAuth';
import { getJwtSecret } from '../utils/getJwtSecret';
import { assertEmail } from '../utils/assert';

import {
  listVendorPurchaseOrders,
  updateVendorPurchaseOrder,
} from '../controllers/PurchaseOrderController';

const router = express.Router();

/**
 * Vendor login - issues a JWT for portal access
 */
router.post(
  '/login',
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { vendorId, email } = req.body as { vendorId?: string; email?: string };
      if (!vendorId) {
        return res.status(400).json({ message: 'vendorId required' });
      }
      if (email !== undefined) {
        assertEmail(email);
      }

      const vendor = await Vendor.findById(vendorId).lean();
      if (!vendor || (email && vendor.email !== email)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      let secret: string;
      try {
        secret = getJwtSecret(process.env, true);
      } catch {
        return res.status(500).json({ message: 'Server configuration issue' });
      }

      const token = jwt.sign({ id: vendor._id.toString() }, secret, {
        expiresIn: '7d',
      });
      return res.json({ token });
    } catch (err) {
      return next(err);
    }
  },
);

// All routes below require a valid vendor token
router.use(requireVendorAuth);

/**
 * List purchase orders for the authenticated vendor
 * (supports both /purchase-orders and /pos for backward compatibility)
 */
router.get('/purchase-orders', listVendorPurchaseOrders);
router.get('/pos', listVendorPurchaseOrders);

/**
 * Retrieve a single purchase order for the authenticated vendor
 */
router.get(
  '/purchase-orders/:id',
  async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const vendorId = req.vendorId;
      const po = await PurchaseOrder.findOne({ _id: id, vendor: vendorId }).lean();
      if (!po) {
        return res.status(404).json({ message: 'Not found' });
      }
      return res.json(po);
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * Update a purchase order for the authenticated vendor
 * (supports both /purchase-orders/:id and /pos/:id for backward compatibility)
 */
router.put('/purchase-orders/:id', updateVendorPurchaseOrder);
router.put('/pos/:id', updateVendorPurchaseOrder);

export default router;
