/*
 * SPDX-License-Identifier: MIT
 */

import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from '../../../types/http';
import { fail } from '../../lib/http';
import { calculateBacklogMetrics, calculatePmCompliance, calculateReliabilityMetrics } from './metricsService';

const listQuerySchema = z.object({
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
  assetIds: z
    .union([
      z.string().transform((value) => value.split(',').map((entry) => entry.trim()).filter(Boolean)),
      z.array(z.string().trim().min(1)),
    ])
    .optional(),
});

const parseQuery = (req: AuthedRequest) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return { error: parsed.error.errors.map((issue) => issue.message).join(', ') } as const;
  }

  const window = {
    start: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    end: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    assetIds: parsed.data.assetIds,
  } as const;

  return { window } as const;
};

export const reliabilityMetricsHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }

  try {
    const result = await calculateReliabilityMetrics(req.tenantId!, parsed.window);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const backlogMetricsHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }

  try {
    const result = await calculateBacklogMetrics(req.tenantId!, parsed.window);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const pmComplianceHandler = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const parsed = parseQuery(req);
  if ('error' in parsed) {
    fail(res, parsed.error ?? 'Invalid request', 400);
    return;
  }

  try {
    const result = await calculatePmCompliance(req.tenantId!, parsed.window);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
