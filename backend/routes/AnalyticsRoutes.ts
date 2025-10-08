/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
  kpiJson,
  kpiCsv,
  kpiXlsx,
  kpiPdf,
  trendJson,
  trendCsv,
  trendPdf,
} from '../controllers/AnalyticsController';

const router = express.Router();
router.use(requireAuth);

router.get('/kpis', kpiJson);
router.get('/kpis.csv', kpiCsv);
router.get('/kpis.xlsx', kpiXlsx);
router.get('/kpis.pdf', kpiPdf);
router.get('/trends', trendJson);
router.get('/trends.csv', trendCsv);
router.get('/trends.pdf', trendPdf);

export default router;
