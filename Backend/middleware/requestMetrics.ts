/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Request, Response } from 'express';
import { httpRequestDurationMs, httpRequestsTotal } from '../utils/metrics';

const resolveRouteLabel = (req: Request): string => {
  if (req.route?.path) {
    return `${req.baseUrl ?? ''}${req.route.path}`;
  }
  return req.originalUrl?.split('?')[0] ?? req.path ?? 'unknown';
};

const requestMetrics = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode?.toString() ?? '0';
    const route = resolveRouteLabel(req);
    httpRequestDurationMs.labels(req.method, route, status).observe(duration);
    httpRequestsTotal.labels(req.method, route, status).inc();
  });

  next();
};

export default requestMetrics;
