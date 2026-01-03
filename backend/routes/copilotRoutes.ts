/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type RequestHandler } from 'express';
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

const copilotHandler: RequestHandler = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest<ParamsDictionary, unknown, CopilotRequestBody>;
    const tenantId = authedReq.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }
    const query = typeof authedReq.body?.query === 'string' ? authedReq.body.query.trim() : '';
    if (!query) {
      sendResponse(res, null, 'query is required', 400);
      return;
    }
    const workOrderId =
      typeof authedReq.body?.workOrderId === 'string' ? authedReq.body.workOrderId : undefined;
    const assetId = typeof authedReq.body?.assetId === 'string' ? authedReq.body.assetId : undefined;
    if (!workOrderId && !assetId) {
      sendResponse(res, null, 'workOrderId or assetId is required', 400);
      return;
    }
    const plantId = authedReq.plantId ?? authedReq.siteId;
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
};

router.post('/copilot', copilotHandler);

export default router;
