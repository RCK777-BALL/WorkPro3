/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { buildFailurePrediction, buildWorkOrderCopilot } from '../services/failureInsights';
import { requireAuth } from '../middleware/authMiddleware';
import type { AuthedRequest } from '../types/http';
import sendResponse from '../utils/sendResponse';

const router = Router();

router.use(requireAuth);

router.get('/failure-prediction', async (req: AuthedRequest, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }

    const { assetId, workOrderId } = req.query as { assetId?: string; workOrderId?: string };
    const result = await buildFailurePrediction({
      tenantId,
      siteId: req.siteId,
      assetId,
      workOrderId,
    });
    sendResponse(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/work-orders/:id/copilot', async (
  req: AuthedRequest<ParamsDictionary, unknown, unknown>,
  res,
  next,
) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      sendResponse(res, null, 'Tenant context required', 400);
      return;
    }
    const workOrderId = req.params.id;
    const result = await buildWorkOrderCopilot({ tenantId, siteId: req.siteId, workOrderId });
    sendResponse(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;

