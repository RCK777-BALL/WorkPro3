/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import {
  createDowntimeEventHandler,
  deleteDowntimeEventHandler,
  exportDowntimeEventsCsvHandler,
  exportDowntimeEventsXlsxHandler,
  getDowntimeEventHandler,
  getDowntimeEventsHandler,
  updateDowntimeEventHandler,
} from '../controllers/DowntimeEventController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/', getDowntimeEventsHandler);
router.get('/export.csv', exportDowntimeEventsCsvHandler);
router.get('/export.xlsx', exportDowntimeEventsXlsxHandler);
router.get('/:id', getDowntimeEventHandler);
router.post('/', createDowntimeEventHandler);
router.put('/:id', updateDowntimeEventHandler);
router.delete('/:id', deleteDowntimeEventHandler);

export default router;
