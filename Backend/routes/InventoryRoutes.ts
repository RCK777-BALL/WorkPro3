import express from 'express';
import { getInventoryItems } from '../controllers/InventoryItemController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);
router.get('/', getInventoryItems);

export default router;

