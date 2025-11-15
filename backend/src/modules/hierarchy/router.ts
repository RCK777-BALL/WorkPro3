/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
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

router.get('/', requirePermission('hierarchy', 'read'), getHierarchy);
router.get('/assets/:assetId', requirePermission('hierarchy', 'read'), getAssetDetails);

router.post('/departments', requirePermission('hierarchy', 'write'), createDepartmentHandler);
router.put('/departments/:departmentId', requirePermission('hierarchy', 'write'), updateDepartmentHandler);
router.delete(
  '/departments/:departmentId',
  requirePermission('hierarchy', 'delete'),
  deleteDepartmentHandler,
);

router.post('/lines', requirePermission('hierarchy', 'write'), createLineHandler);
router.put('/lines/:lineId', requirePermission('hierarchy', 'write'), updateLineHandler);
router.delete('/lines/:lineId', requirePermission('hierarchy', 'delete'), deleteLineHandler);

router.post('/stations', requirePermission('hierarchy', 'write'), createStationHandler);
router.put('/stations/:stationId', requirePermission('hierarchy', 'write'), updateStationHandler);
router.delete('/stations/:stationId', requirePermission('hierarchy', 'delete'), deleteStationHandler);

router.post('/assets', requirePermission('hierarchy', 'write'), createAssetHandler);
router.put('/assets/:assetId', requirePermission('hierarchy', 'write'), updateAssetHandler);
router.delete('/assets/:assetId', requirePermission('hierarchy', 'delete'), deleteAssetHandler);

export default router;
