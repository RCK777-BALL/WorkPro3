/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import {
  getAllNotifications,
  getNotificationInbox,
  getNotificationById,
  createNotification,
  updateNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../controllers/NotificationController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/inbox', getNotificationInbox);
router.get('/', getAllNotifications);
router.get('/:id', validateObjectId('id'), getNotificationById);
router.post('/', createNotification);
router.post('/read-all', markAllNotificationsRead);
router.put('/:id', validateObjectId('id'), updateNotification);
router.post('/:id/read', validateObjectId('id'), markNotificationRead);
router.delete('/:id', validateObjectId('id'), deleteNotification);

export default router;
