/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getRecentLogs } from '../controllers/AuditController';

const router = express.Router();

router.use(requireAuth);

router.get('/logs', getRecentLogs);

export default router;
