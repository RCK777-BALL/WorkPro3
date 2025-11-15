/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { requireAuth } from '../middleware/authMiddleware';
import type { AuthedRequest } from '../types/http';
import sendResponse from '../utils/sendResponse';
import { runCopilotRag } from '../services/copilotRag';

const router = Router();

router.use(requireAuth);

interface CopilotRequestBody {
  query?: string;
  workOrderId?: string;
  assetId?: string;
}

router.post('/copilot', async (req: AuthedRequest<ParamsDictionary, unknown, CopilotRequestBody>, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query) {
      sendResponse(res, null, 'query is required', 400);
      return;
    }
    const workOrderId = typeof req.body?.workOrderId === 'string' ? req.body.workOrderId : undefined;
    const assetId = typeof req.body?.assetId === 'string' ? req.body.assetId : undefined;
    if (!workOrderId && !assetId) {
      sendResponse(res, null, 'workOrderId or assetId is required', 400);
      return;
    }
    const plantId = req.plantId ?? req.siteId;
    const result = await runCopilotRag({
      tenantId,
      ...(plantId ? { plantId } : {}),
      ...(workOrderId ? { workOrderId } : {}),
      ...(assetId ? { assetId } : {}),
      query,
    });
    sendResponse(res, result);
  } catch (err: any) {
    if (err instanceof Error && err.message === 'work-order-not-found') {
      sendResponse(res, null, 'Work order not found', 404);
      return;
    }
    next(err);
  }
});

export default router;
