/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../middleware/authMiddleware';
import {
  kpiCsv,
  kpiJson,
  kpiPdf,
  kpiXlsx,
  trendCsv,
  trendJson,
  trendPdf,
} from '../controllers/AnalyticsController';

const router = Router();

const kpis = {
  completionRate: 92,
  mttr: 4.2,
  backlog: 17,
};

const trend = [
  { date: '2024-06-01', created: 6, completed: 4 },
  { date: '2024-06-02', created: 5, completed: 5 },
  { date: '2024-06-03', created: 4, completed: 6 },
];

router.get('/summary', (_req, res) => {
  res.json({ success: true, data: { kpis, trend }, message: 'Analytics summary' });
});

router.use(requireAuth);

router.get('/kpis', kpiJson);
router.get('/kpis.csv', kpiCsv);
router.get('/kpis.xlsx', kpiXlsx);
router.get('/kpis.pdf', kpiPdf);

router.get('/trends', trendJson);
router.get('/trends.csv', trendCsv);
router.get('/trends.pdf', trendPdf);

export default router;
