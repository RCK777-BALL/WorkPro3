/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import {
  getHierarchy,
  getAssetDetails,
  createDepartmentHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler,
  createLineHandler,
  updateLineHandler,
  deleteLineHandler,
  createStationHandler,
  updateStationHandler,
  deleteStationHandler,
  createAssetHandler,
  updateAssetHandler,
  deleteAssetHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', getHierarchy);
router.get('/assets/:assetId', getAssetDetails);

router.post('/departments', createDepartmentHandler);
router.put('/departments/:departmentId', updateDepartmentHandler);
router.delete('/departments/:departmentId', deleteDepartmentHandler);

router.post('/lines', createLineHandler);
router.put('/lines/:lineId', updateLineHandler);
router.delete('/lines/:lineId', deleteLineHandler);

router.post('/stations', createStationHandler);
router.put('/stations/:stationId', updateStationHandler);
router.delete('/stations/:stationId', deleteStationHandler);

router.post('/assets', createAssetHandler);
router.put('/assets/:assetId', updateAssetHandler);
router.delete('/assets/:assetId', deleteAssetHandler);

export default router;
