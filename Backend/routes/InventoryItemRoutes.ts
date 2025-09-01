import express from 'express';
import {
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockItems,
  searchInventoryItems,
} from '../controllers/InventoryItemController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);
router.get('/', getAllInventoryItems);
router.get('/low-stock', getLowStockItems);
router.get('/search', searchInventoryItems);
router.get('/:id', getInventoryItemById);
router.post('/', createInventoryItem);
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);

export default router;
