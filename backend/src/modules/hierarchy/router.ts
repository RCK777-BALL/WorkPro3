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
  getHierarchy,
  getAssetDetails,
  createDepartmentHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler,
  createLineHandler,
  createLineForDepartmentHandler,
  updateLineHandler,
  updateLineForDepartmentHandler,
  deleteLineHandler,
  deleteLineForDepartmentHandler,
  createStationHandler,
  createStationForLineHandler,
  updateStationHandler,
  updateStationForLineHandler,
  deleteStationHandler,
  deleteStationForLineHandler,
  createAssetHandler,
  createAssetForStationHandler,
  updateAssetHandler,
  updateAssetForStationHandler,
  deleteAssetHandler,
  deleteAssetForStationHandler,
  duplicateAssetHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(authorizeTenantSite());
router.use(auditDataAccess('hierarchy', { entityIdParams: ['assetId', 'departmentId', 'lineId', 'stationId'] }));

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

router.post(
  '/departments/:departmentId/lines',
  requirePermission('hierarchy', 'write'),
  createLineForDepartmentHandler,
);
router.put(
  '/departments/:departmentId/lines/:lineId',
  requirePermission('hierarchy', 'write'),
  updateLineForDepartmentHandler,
);
router.delete(
  '/departments/:departmentId/lines/:lineId',
  requirePermission('hierarchy', 'delete'),
  deleteLineForDepartmentHandler,
);

router.post('/stations', requirePermission('hierarchy', 'write'), createStationHandler);
router.put('/stations/:stationId', requirePermission('hierarchy', 'write'), updateStationHandler);
router.delete('/stations/:stationId', requirePermission('hierarchy', 'delete'), deleteStationHandler);

router.post(
  '/departments/:departmentId/lines/:lineId/stations',
  requirePermission('hierarchy', 'write'),
  createStationForLineHandler,
);
router.put(
  '/departments/:departmentId/lines/:lineId/stations/:stationId',
  requirePermission('hierarchy', 'write'),
  updateStationForLineHandler,
);
router.delete(
  '/departments/:departmentId/lines/:lineId/stations/:stationId',
  requirePermission('hierarchy', 'delete'),
  deleteStationForLineHandler,
);

router.post('/assets', requirePermission('hierarchy', 'write'), createAssetHandler);
router.put('/assets/:assetId', requirePermission('hierarchy', 'write'), updateAssetHandler);
router.post('/assets/:assetId/duplicate', requirePermission('hierarchy', 'write'), duplicateAssetHandler);
router.delete('/assets/:assetId', requirePermission('hierarchy', 'delete'), deleteAssetHandler);

router.post(
  '/departments/:departmentId/lines/:lineId/stations/:stationId/assets',
  requirePermission('hierarchy', 'write'),
  createAssetForStationHandler,
);
router.put(
  '/departments/:departmentId/lines/:lineId/stations/:stationId/assets/:assetId',
  requirePermission('hierarchy', 'write'),
  updateAssetForStationHandler,
);
router.delete(
  '/departments/:departmentId/lines/:lineId/stations/:stationId/assets/:assetId',
  requirePermission('hierarchy', 'delete'),
  deleteAssetForStationHandler,
);

export default router;
