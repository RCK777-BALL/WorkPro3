/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../../../middleware/authMiddleware';
import tenantScope from '../../../middleware/tenantScope';
import { requirePermission } from '../../auth/permissions';
import {
  createVendorHandler,
  getVendorHandler,
  listVendorsHandler,
  updateVendorHandler,
} from './controller';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', requirePermission('inventory.read'), listVendorsHandler);
router.get('/:vendorId', requirePermission('inventory.read'), getVendorHandler);
router.post('/', requirePermission('inventory.purchase'), createVendorHandler);
router.put('/:vendorId', requirePermission('inventory.purchase'), updateVendorHandler);

export default router;
