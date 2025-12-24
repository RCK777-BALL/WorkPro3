/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import {
  createDowntimeLogHandler,
  deleteDowntimeLogHandler,
  exportDowntimeLogsHandler,
  exportDowntimeLogsXlsxHandler,
  getDowntimeLogHandler,
  getDowntimeLogsHandler,
  updateDowntimeLogHandler,
} from '../controllers/DowntimeLogController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', getDowntimeLogsHandler);
router.get('/export.csv', exportDowntimeLogsHandler);
router.get('/export.xlsx', exportDowntimeLogsXlsxHandler);
router.get('/:id', getDowntimeLogHandler);
router.post('/', createDowntimeLogHandler);
router.put('/:id', updateDowntimeLogHandler);
router.delete('/:id', deleteDowntimeLogHandler);

export default router;
