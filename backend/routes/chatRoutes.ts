/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import validateObjectId from '../middleware/validateObjectId';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';
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
  markChannelRead,
  markDirectConversationRead,
  uploadChatAttachment,
} from '../controllers/ChatController';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'chat');
mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(requireAuth);
router.use(tenantScope);

router.get('/channels', getChannels);
router.post('/channels', createChannel);
router.patch('/channels/:channelId', validateObjectId('channelId'), updateChannel);
router.delete('/channels/:channelId', validateObjectId('channelId'), deleteChannel);
router.get('/channels/:channelId/messages', validateObjectId('channelId'), getChannelMessages);
router.post('/channels/:channelId/messages', validateObjectId('channelId'), sendChannelMessage);
router.post('/channels/:channelId/read', validateObjectId('channelId'), markChannelRead);

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
router.post(
  '/direct/:conversationId/read',
  validateObjectId('conversationId'),
  markDirectConversationRead,
);

router.post('/upload', upload.single('file'), uploadChatAttachment);

export default router;
