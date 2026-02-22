/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { buildFailurePrediction, buildWorkOrderCopilot } from '../services/failureInsights';
import { requireAuth } from '../middleware/authMiddleware';
import type { AuthedRequest } from '../types/http';
import sendResponse from '../utils/sendResponse';

const router = Router();

router.use(requireAuth);

const failurePredictionHandler: RequestHandler = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest;
    const tenantId = authedReq.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }

    const { assetId, workOrderId } = authedReq.query as { assetId?: string; workOrderId?: string };
    const result = await buildFailurePrediction({
      tenantId,
      siteId: authedReq.siteId,
      assetId,
      workOrderId,
    });
    sendResponse(res, result);
  } catch (err) {
    next(err);
  }
};

const workOrderCopilotHandler: RequestHandler = async (req, res, next) => {
  try {
    const authedReq = req as AuthedRequest<ParamsDictionary, unknown, unknown>;
    const tenantId = authedReq.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }
    const raw = authedReq.params.id;
    const workOrderId = Array.isArray(raw) ? raw[0] : raw;
    const result = await buildWorkOrderCopilot({ tenantId, siteId: authedReq.siteId, workOrderId });
    sendResponse(res, result);
  } catch (err) {
    next(err);
  }
};

router.get('/failure-prediction', failurePredictionHandler);
router.post('/work-orders/:id/copilot', workOrderCopilotHandler);

export default router;
