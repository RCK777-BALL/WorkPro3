/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
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

router.get('/parts', listPartsHandler);
router.get('/parts/:partId', getPartHandler);
router.post('/parts', savePartHandler);
router.put('/parts/:partId', savePartHandler);
router.delete('/parts/:partId', deletePartHandler);

router.get('/locations', listLocationsHandler);
router.get('/locations/:locationId', getLocationHandler);
router.post('/locations', saveLocationHandler);
router.put('/locations/:locationId', saveLocationHandler);
router.delete('/locations/:locationId', deleteLocationHandler);

router.get('/stocks', listPartStocksHandler);
router.get('/stocks/:stockId', getPartStockHandler);
router.post('/stocks', savePartStockHandler);
router.put('/stocks/:stockId', savePartStockHandler);
router.delete('/stocks/:stockId', deletePartStockHandler);

router.post('/stocks/:stockId/adjust', adjustStockHandler);
router.post('/stocks/:stockId/receive', receiveStockHandler);

export default router;
