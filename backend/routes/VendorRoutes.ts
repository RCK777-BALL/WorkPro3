/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor
} from '../controllers/VendorController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);
router.get('/', getAllVendors);
router.get('/:id', getVendorById);
router.post('/', createVendor);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

export default router;
