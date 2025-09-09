import express from 'express';
import { getPredictions, getTrend } from '../controllers/PredictiveController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();
router.use(requireAuth);
router.get('/', (req: AuthedRequest, res, next) => getPredictions(req, res, next));
router.get('/trend/:assetId/:metric', (req: AuthedRequest, res, next) =>
  getTrend(req, res, next)
);

export default router;
