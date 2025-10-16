/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { getStatusDefinitions } from '../config/statuses';
import sendResponse from '../utils/sendResponse';

const router = Router();

router.get('/', (_req, res) => {
  const statuses = getStatusDefinitions();
  sendResponse(
    res,
    {
      statuses,
      updatedAt: new Date().toISOString(),
      total: statuses.length,
    },
    null,
    200,
    'Status definitions retrieved',
  );
});

export default router;

