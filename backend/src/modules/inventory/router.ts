/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import {
  listPartsHandler,
  savePartHandler,
  listVendorsHandler,
  saveVendorHandler,
  listAlertsHandler,
  createPurchaseOrderHandler,
  listPurchaseOrdersHandler,
  exportPurchaseOrdersHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/parts', listPartsHandler);
router.post('/parts', savePartHandler);
router.put('/parts/:partId', savePartHandler);

router.get('/vendors', listVendorsHandler);
router.post('/vendors', saveVendorHandler);
router.put('/vendors/:vendorId', saveVendorHandler);

router.get('/alerts', listAlertsHandler);
router.post('/purchase-orders', createPurchaseOrderHandler);
router.get('/purchase-orders', listPurchaseOrdersHandler);
router.get('/purchase-orders/export', exportPurchaseOrdersHandler);

export default router;
