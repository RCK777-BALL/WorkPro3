/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';

import {
  createNotification,
  deleteNotification,
  getAllNotifications,
  getNotificationById,
  markNotificationRead,
  updateNotification,
} from '../controllers/NotificationController';
import { requireAuth } from '../middleware/authMiddleware';
import validateObjectId from '../middleware/validateObjectId';

const router = Router();

router.use(requireAuth);

router.get('/', getAllNotifications);
router.get('/:id', validateObjectId('id'), getNotificationById);
router.post('/', createNotification);
router.post('/:id/read', validateObjectId('id'), markNotificationRead);
router.put('/:id', validateObjectId('id'), updateNotification);
router.delete('/:id', validateObjectId('id'), deleteNotification);

export default router;
