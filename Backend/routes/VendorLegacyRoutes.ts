/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import {
  createVendor,
  deleteVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
} from '../controllers/VendorController';
import { requireAuth } from '../middleware/authMiddleware';
import validateObjectId from '../middleware/validateObjectId';

const router = Router();

router.use(requireAuth);

router.get('/', getAllVendors);
router.get('/:id', validateObjectId('id'), getVendorById);
router.post('/', createVendor);
router.put('/:id', validateObjectId('id'), updateVendor);
router.delete('/:id', validateObjectId('id'), deleteVendor);

export default router;
