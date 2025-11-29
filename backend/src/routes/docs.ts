/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { apiAccessMiddleware } from '../../middleware/apiAccess';
import { swaggerSpec } from '../../utils/swagger';

const router = Router();

router.use(apiAccessMiddleware);

router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'WorkPro3 API reference',
    docs: {
      openapi: '/api/docs/openapi',
      swaggerUi: '/api/docs/ui',
    },
    endpoints: [
      {
        method: 'POST',
        path: '/api/iot/ingest',
        description: 'Batch ingest telemetry readings for an asset.',
      },
      {
        method: 'POST',
        path: '/api/iot/sensors/ingest',
        description: 'Ingest sensor readings and update meter-based preventive maintenance.',
      },
      {
        method: 'POST',
        path: '/api/integrations/v2/accounting/:provider/vendors/sync',
        description: 'Sync vendor records with QuickBooks or Xero.',
      },
      {
        method: 'POST',
        path: '/api/integrations/v2/accounting/:provider/purchase-orders/sync',
        description: 'Push purchase orders to the configured accounting provider.',
      },
      {
        method: 'POST',
        path: '/api/integrations/v2/accounting/:provider/costs/sync',
        description: 'Sync job cost actuals to QuickBooks or Xero.',
      },
      {
        method: 'POST',
        path: '/api/webhooks/slack',
        description: 'Relay webhook payloads to a Slack incoming webhook URL.',
      },
      {
        method: 'POST',
        path: '/api/webhooks/teams',
        description: 'Relay webhook payloads to a Microsoft Teams incoming webhook URL.',
      },
    ],
  });
});

router.get('/openapi', (_req, res) => {
  res.json(swaggerSpec);
});

export default router;
