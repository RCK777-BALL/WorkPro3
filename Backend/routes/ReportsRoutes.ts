import express from 'express';
import {
  getAnalyticsReport,
  downloadReport,
  getTrendData,
  exportTrendData,
} from '../controllers/ReportsController';
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

router.use(requireAuth);
// Optional query param ?role=ROLE filters user-based analytics metrics
router.get('/analytics', getAnalyticsReport);
// Supports ?format=csv|pdf and ?role=ROLE
router.get('/download', downloadReport);
router.get('/trends', getTrendData);
router.get('/trends/export', exportTrendData);

export default router;
