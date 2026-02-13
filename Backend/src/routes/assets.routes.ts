/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/authMiddleware';
import tenantScope from '../../middleware/tenantScope';
import { requirePermission } from '../auth/permissions';
import {
  listAssetsHandler,
  getAssetHandler,
  createAssetHandler,
  updateAssetHandler,
  deleteAssetHandler,
} from '../controllers/assets.controller';
import { validateAssetCreate, validateAssetQuery, validateAssetUpdate } from '../validators/assets.validators';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('assets.read'), validateAssetQuery, listAssetsHandler);
router.get('/:assetId', requirePermission('assets.read'), getAssetHandler);
router.post('/', requirePermission('assets.write'), validateAssetCreate, createAssetHandler);
router.put('/:assetId', requirePermission('assets.write'), validateAssetUpdate, updateAssetHandler);
router.delete('/:assetId', requirePermission('assets.delete'), deleteAssetHandler);

export default router;
