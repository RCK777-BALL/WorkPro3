import express from 'express';
import { getPredictions } from '../controllers/PredictiveController';
import { requireAuth } from '../middleware/authMiddleware';
import { AuthedRequest } from '../types/AuthedRequest';

const router = express.Router();
router.use(requireAuth);
router.get('/', (req: AuthedRequest, res, next) => getPredictions(req, res, next));

export default router;
