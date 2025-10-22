/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import {
  getChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getChannelMessages,
  sendChannelMessage,
  updateMessage,
  deleteMessage,
  getDirectMessages,
  createDirectMessage,
  deleteDirectMessage,
  getDirectMessagesForUser,
  sendDirectMessage,
} from '../controllers/ChatController';

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

router.get('/channels', getChannels);
router.post('/channels', createChannel);
router.patch('/channels/:channelId', validateObjectId('channelId'), updateChannel);
router.delete('/channels/:channelId', validateObjectId('channelId'), deleteChannel);
router.get('/channels/:channelId/messages', validateObjectId('channelId'), getChannelMessages);
router.post('/channels/:channelId/messages', validateObjectId('channelId'), sendChannelMessage);

router.patch('/messages/:messageId', validateObjectId('messageId'), updateMessage);
router.delete('/messages/:messageId', validateObjectId('messageId'), deleteMessage);

router.get('/direct', getDirectMessages);
router.post('/direct', createDirectMessage);
router.delete('/direct/:conversationId', validateObjectId('conversationId'), deleteDirectMessage);
router.get(
  '/direct/:conversationId/messages',
  validateObjectId('conversationId'),
  getDirectMessagesForUser,
);
router.post(
  '/direct/:conversationId/messages',
  validateObjectId('conversationId'),
  sendDirectMessage,
);

export default router;
