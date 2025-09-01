import express from 'express';
import {
  listVendorPurchaseOrders,
  updateVendorPurchaseOrder,
} from '../controllers/PurchaseOrderController';
import { requireVendorToken } from '../middleware/vendorAuth';

const router = express.Router();

router.use(requireVendorToken);
router.get('/pos', listVendorPurchaseOrders);
router.put('/pos/:id', updateVendorPurchaseOrder);

export default router;
