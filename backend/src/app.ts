/*
 * SPDX-License-Identifier: MIT
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { buildCorsOptions } from './config/cors';
import { buildAuthLimiter, buildHelmet, buildWriteLimiter } from './config/security';
import requestId from './middleware/requestId';

import assetsRouter from './routes/assets.routes';
import workOrdersRouter from './routes/workorders.routes';
import pmRouter from './routes/pm.routes';
import purchaseOrdersRouter from './routes/purchaseOrders.routes';
import healthRouter from './routes/health.routes';
import summaryRouter from './routes/summary.routes';
import metricsRouter from './routes/metrics.routes';
import syncRouter from './routes/sync.routes';

export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  app.use(buildHelmet());
  app.use(cors(buildCorsOptions(process.env.CORS_ORIGIN)));
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(requestId);

  app.use('/api/auth', buildAuthLimiter());
  app.use('/api', buildWriteLimiter());

  app.use('/api/assets', assetsRouter);
  app.use('/api/work-orders', workOrdersRouter);
  app.use('/api/pm', pmRouter);
  app.use('/api/purchase-orders', purchaseOrdersRouter);
  app.use('/api/sync', syncRouter);
  app.use('/health', healthRouter);
  app.use('/summary', summaryRouter);
  app.use('/metrics', metricsRouter);

  return app;
};
