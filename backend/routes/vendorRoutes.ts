/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import {
  createVendorHandler,
  deleteVendorHandler,
  getAllVendors,
  getVendorById,
  updateVendorHandler,
} from '../controllers/VendorController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', getAllVendors);
router.get('/:id', getVendorById);
router.post('/', createVendorHandler);
router.put('/:id', updateVendorHandler);
router.delete('/:id', deleteVendorHandler);

export default router;
