/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'PART-001',
        name: 'Universal Bearing',
        tenantId: req.tenantId,
        quantity: 42,
      },
    ],
  });
});

export default router;
