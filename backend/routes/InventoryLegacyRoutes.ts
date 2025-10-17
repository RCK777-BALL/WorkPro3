/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import {
  createInventoryItem,
  deleteInventoryItem,
  getAllInventoryItems,
  getInventoryItemById,
  getInventoryItems,
  getLowStockItems,
  searchInventoryItems,
  updateInventoryItem,
  useInventoryItem,
} from '../controllers/InventoryController';
import { requireAuth } from '../middleware/authMiddleware';
import validateObjectId from '../middleware/validateObjectId';

const router = Router();

router.use(requireAuth);

router.get('/summary', getInventoryItems);
router.get('/low-stock', getLowStockItems);
router.get('/search', searchInventoryItems);
router.get('/', getAllInventoryItems);
router.get('/:id', validateObjectId('id'), getInventoryItemById);
router.post('/', createInventoryItem);
router.put('/:id', validateObjectId('id'), updateInventoryItem);
router.delete('/:id', validateObjectId('id'), deleteInventoryItem);
router.post('/:id/use', validateObjectId('id'), useInventoryItem);

export default router;
