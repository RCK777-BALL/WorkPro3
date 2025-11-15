/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import {
  listPartsHandler,
  savePartHandler,
  listVendorsHandler,
  saveVendorHandler,
  listAlertsHandler,
  createPurchaseOrderHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/parts', requirePermission('inventory', 'read'), listPartsHandler);
router.post('/parts', requirePermission('inventory', 'manage'), savePartHandler);
router.put('/parts/:partId', requirePermission('inventory', 'manage'), savePartHandler);

router.get('/vendors', requirePermission('inventory', 'read'), listVendorsHandler);
router.post('/vendors', requirePermission('inventory', 'manage'), saveVendorHandler);
router.put('/vendors/:vendorId', requirePermission('inventory', 'manage'), saveVendorHandler);

router.get('/alerts', requirePermission('inventory', 'read'), listAlertsHandler);
router.post(
  '/purchase-orders',
  requirePermission('inventory', 'purchase'),
  createPurchaseOrderHandler,
);

export default router;
