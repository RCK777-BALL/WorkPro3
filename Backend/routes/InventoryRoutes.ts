import express from 'express';
import {
  getInventoryItems,
  getAllInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockItems,
  searchInventoryItems,
  useInventoryItem,
} from '../controllers/InventoryController';
import { requireAuth } from '../middleware/authMiddleware';
import siteScope from '../middleware/siteScope';

const router = express.Router();

router.use(requireAuth);
router.use(siteScope);

// Summary route retained for dashboards
router.get('/summary', getInventoryItems);

// CRUD routes
router.get('/low-stock', getLowStockItems);
router.get('/search', searchInventoryItems);
router.get('/', getAllInventoryItems);
router.get('/:id', getInventoryItemById);
router.post('/', createInventoryItem);
router.put('/:id', updateInventoryItem);
router.post('/:id/use', useInventoryItem);
router.delete('/:id', deleteInventoryItem);

export default router;

