/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { sendResponse } from '../utils/sendResponse';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

const importSchema = z.object({
  entity: z.string().min(1),
  items: z.array(z.record(z.string(), z.any())).min(1),
  dryRun: z.boolean().optional(),
});

router.post('/', (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    sendResponse(res, null, parsed.error.flatten(), 400);
    return;
  }
  const { entity, items, dryRun } = parsed.data;
  sendResponse(
    res,
    {
      entity,
      received: items.length,
      dryRun: dryRun ?? false,
    },
    null,
    dryRun ? 200 : 201,
    dryRun ? 'Import preview generated' : 'Import accepted',
  );
});

router.get('/status', (req, res) => {
  sendResponse(res, {
    tenantId: req.tenantId,
    lastRunAt: null,
    pendingJobs: 0,
  });
});

export default router;
