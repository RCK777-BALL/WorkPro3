/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getAuditLogs } from '../controllers/AuditController';

const router = express.Router();

router.use(requireAuth);

router.get('/', getAuditLogs);

export default router;
