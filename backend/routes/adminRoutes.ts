/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);
router.use(requireRole('admin'));

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

export default router;
