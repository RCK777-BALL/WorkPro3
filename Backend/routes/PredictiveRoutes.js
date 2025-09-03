import express from 'express';
import { getPredictions, getTrend } from '../controllers/PredictiveController';
import { requireAuth } from '../middleware/authMiddleware';
const router = express.Router();
router.use(requireAuth);
router.get('/', (req, res, next) => getPredictions(req, res, next));
router.get('/trend/:assetId/:metric', (req, res, next) => getTrend(req, res, next));
export default router;
