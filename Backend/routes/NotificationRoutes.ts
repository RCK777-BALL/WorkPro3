import express from 'express';
import { getNotifications } from '../controllers/NotificationController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);
router.get('/', getNotifications);

export default router;
