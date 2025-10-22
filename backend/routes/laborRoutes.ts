/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      tenantId: req.tenantId,
      totalHours: 0,
      activeWorkers: 0,
    },
  });
});

export default router;
