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
  duplicateAssetHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('hierarchy', 'read' as any), getHierarchy);
router.get('/assets/:assetId', requirePermission('hierarchy', 'read' as any), getAssetDetails);

router.post('/departments', requirePermission('hierarchy', 'write' as any), createDepartmentHandler);
router.put('/departments/:departmentId', requirePermission('hierarchy', 'write' as any), updateDepartmentHandler);
router.delete(
  '/departments/:departmentId',
  requirePermission('hierarchy', 'delete' as any),
  deleteDepartmentHandler,
);

router.post('/lines', requirePermission('hierarchy', 'write' as any), createLineHandler);
router.put('/lines/:lineId', requirePermission('hierarchy', 'write' as any), updateLineHandler);
router.delete('/lines/:lineId', requirePermission('hierarchy', 'delete' as any), deleteLineHandler);

router.post('/stations', requirePermission('hierarchy', 'write' as any), createStationHandler);
router.put('/stations/:stationId', requirePermission('hierarchy', 'write' as any), updateStationHandler);
router.delete('/stations/:stationId', requirePermission('hierarchy', 'delete' as any), deleteStationHandler);

router.post('/assets', requirePermission('hierarchy', 'write' as any), createAssetHandler);
router.put('/assets/:assetId', requirePermission('hierarchy', 'write' as any), updateAssetHandler);
router.post('/assets/:assetId/duplicate', requirePermission('hierarchy', 'write' as any), duplicateAssetHandler);
router.delete('/assets/:assetId', requirePermission('hierarchy', 'delete' as any), deleteAssetHandler);

export default router;
