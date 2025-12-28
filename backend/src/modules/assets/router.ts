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
  createAssetMeterHandler,
  getAssetDetailsHandler,
  ingestMeterReadingsHandler,
  listAssetMetersHandler,
  resolveAssetScanHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(authorizeTenantSite());
router.use(auditDataAccess('assets', { entityIdParams: ['assetId'] }));

router.get('/:assetId/details', requirePermission('hierarchy', 'read'), getAssetDetailsHandler);
router.get('/scan/resolve', requirePermission('hierarchy', 'read'), resolveAssetScanHandler);
router.get('/:assetId/meters', requirePermission('hierarchy', 'read'), listAssetMetersHandler);
router.post('/:assetId/meters', requirePermission('hierarchy', 'write'), createAssetMeterHandler);
router.post(
  '/:assetId/meters/readings',
  requirePermission('hierarchy', 'write'),
  ingestMeterReadingsHandler,
);

export default router;
