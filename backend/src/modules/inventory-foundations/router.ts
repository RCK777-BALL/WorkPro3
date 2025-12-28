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
  adjustStockHandler,
  deleteLocationHandler,
  deletePartHandler,
  deletePartStockHandler,
  getLocationHandler,
  getPartHandler,
  getPartStockHandler,
  listLocationsHandler,
  listPartStocksHandler,
  listPartsHandler,
  receiveStockHandler,
  saveLocationHandler,
  savePartHandler,
  savePartStockHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(authorizeTenantSite());
router.use(auditDataAccess('inventory_foundations', { entityIdParams: ['partId', 'locationId', 'stockId'] }));

router.get('/parts', requirePermission('inventory.read'), listPartsHandler);
router.get('/parts/:partId', requirePermission('inventory.read'), getPartHandler);
router.post('/parts', requirePermission('inventory.manage'), savePartHandler);
router.put('/parts/:partId', requirePermission('inventory.manage'), savePartHandler);
router.delete('/parts/:partId', requirePermission('inventory.manage'), deletePartHandler);

router.get('/locations', requirePermission('inventory.read'), listLocationsHandler);
router.get('/locations/:locationId', requirePermission('inventory.read'), getLocationHandler);
router.post('/locations', requirePermission('inventory.manage'), saveLocationHandler);
router.put('/locations/:locationId', requirePermission('inventory.manage'), saveLocationHandler);
router.delete('/locations/:locationId', requirePermission('inventory.manage'), deleteLocationHandler);

router.get('/stocks', requirePermission('inventory.read'), listPartStocksHandler);
router.get('/stocks/:stockId', requirePermission('inventory.read'), getPartStockHandler);
router.post('/stocks', requirePermission('inventory.manage'), savePartStockHandler);
router.put('/stocks/:stockId', requirePermission('inventory.manage'), savePartStockHandler);
router.delete('/stocks/:stockId', requirePermission('inventory.manage'), deletePartStockHandler);

router.post('/stocks/:stockId/adjust', requirePermission('inventory.manage'), adjustStockHandler);
router.post('/stocks/:stockId/receive', requirePermission('inventory.manage'), receiveStockHandler);

export default router;
