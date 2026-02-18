/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import authorizeTenantSite from '../../middleware/tenantAuthorization';
import { auditDataAccess } from '../audit';
import {
  listPartsHandler,
  savePartHandler,
  listVendorsHandler,
  saveVendorHandler,
  listAlertsHandler,
  transitionAlertHandler,
  createPurchaseOrderHandler,
  listLocationsHandler,
  saveLocationHandler,
  listStockItemsHandler,
  receiveInventoryHandler,
  issueInventoryHandler,
  adjustInventoryHandler,
  transferInventoryHandler,
  stockCountHandler,
  adjustStockHandler,
  listReorderSuggestionsHandler,
  transferStockHandler,
  listStockHistoryHandler,
  transitionPurchaseOrderHandler,
  partUsageReportHandler,
  resolvePartScanHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(authorizeTenantSite());
router.use(auditDataAccess('inventory', { entityIdParams: ['partId', 'vendorId', 'locationId', 'purchaseOrderId'] }));

router.get('/scan/resolve', requirePermission('inventory', 'read'), resolvePartScanHandler);
router.get('/parts', requirePermission('inventory', 'read'), listPartsHandler);
router.post('/parts', requirePermission('inventory', 'manage'), savePartHandler);
router.put('/parts/:partId', requirePermission('inventory', 'manage'), savePartHandler);

router.get('/vendors', requirePermission('inventory', 'read'), listVendorsHandler);
router.post('/vendors', requirePermission('inventory', 'manage'), saveVendorHandler);
router.put('/vendors/:vendorId', requirePermission('inventory', 'manage'), saveVendorHandler);

router.get('/alerts', requirePermission('inventory', 'read'), listAlertsHandler);
router.post('/alerts/:alertId/status', requirePermission('inventory', 'manage'), transitionAlertHandler);
router.get(
  '/reorder-suggestions',
  requirePermission('inventory', 'read'),
  listReorderSuggestionsHandler,
);
router.post(
  '/purchase-orders',
  requirePermission('inventory', 'purchase'),
  createPurchaseOrderHandler,
);
router.post(
  '/purchase-orders/:purchaseOrderId/status',
  requirePermission('inventory', 'purchase'),
  transitionPurchaseOrderHandler,
);

router.get('/locations', requirePermission('inventory', 'read'), listLocationsHandler);
router.post('/locations', requirePermission('inventory', 'manage'), saveLocationHandler);
router.put('/locations/:locationId', requirePermission('inventory', 'manage'), saveLocationHandler);

router.get('/stock', requirePermission('inventory', 'read'), listStockItemsHandler);
router.post('/stock/transactions/receive', requirePermission('inventory', 'manage'), receiveInventoryHandler);
router.post('/stock/transactions/issue', requirePermission('inventory', 'manage'), issueInventoryHandler);
router.post('/stock/transactions/adjust', requirePermission('inventory', 'manage'), adjustInventoryHandler);
router.post('/stock/transactions/transfer', requirePermission('inventory', 'manage'), transferInventoryHandler);
router.post('/stock/count', requirePermission('inventory', 'manage'), stockCountHandler);
router.post('/stock/adjust', requirePermission('inventory', 'manage'), adjustStockHandler);
router.post('/transfers', requirePermission('inventory', 'manage'), transferStockHandler);
router.get('/stock/history', requirePermission('inventory', 'read'), listStockHistoryHandler);
router.get('/analytics/usage', requirePermission('inventory', 'read'), partUsageReportHandler);

export default router;
