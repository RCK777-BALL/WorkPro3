import express from 'express';
import jwt from 'jsonwebtoken';
import Vendor from '../models/Vendor';
import PurchaseOrder from '../models/PurchaseOrder';
import { requireVendorAuth } from '../middleware/vendorAuth';

const router = express.Router();

// Vendor login - issues a JWT for portal access
router.post('/login', async (req, res) => {
  const { vendorId, email } = req.body;
  if (!vendorId) {
    res.status(400).json({ message: 'vendorId required' });
    return;
  }

  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor || (email && vendor.email !== email)) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const secret = process.env.VENDOR_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ message: 'Server configuration issue' });
    return;
  }

  const token = jwt.sign({ id: vendor._id.toString() }, secret, {
    expiresIn: '7d',
  });
  res.json({ token });
});

// Retrieve a purchase order for the authenticated vendor
router.get('/purchase-orders/:id', requireVendorAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = (req as any).vendorId;
    const po = await PurchaseOrder.findOne({ _id: id, vendor: vendorId }).lean();
    if (!po) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(po);
  } catch (err) {
    next(err);
  }
});

// Update a purchase order for the authenticated vendor
router.put('/purchase-orders/:id', requireVendorAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendorId = (req as any).vendorId;
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: id, vendor: vendorId },
      req.body,
      { new: true, runValidators: true }
    ).lean();
    if (!po) {
      res.status(404).json({ message: 'Not found' });
      return;
    }
    res.json(po);
  } catch (err) {
    next(err);
  }
});

export default router;
