import { Router } from 'express';
import { getTheme, updateTheme } from '../controllers/ThemeController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);
router.get('/', getTheme);
router.put('/', updateTheme);

export default router;
