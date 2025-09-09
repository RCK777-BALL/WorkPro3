import express from 'express';
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
import { requireAuth } from '../middleware/authMiddleware';

const router = express.Router();

// All chat routes require authentication
router.use(requireAuth);

// Channel management
router.get('/channels', getChannels);
router.post('/channels', createChannel);
router.put('/channels/:channelId', updateChannel);
router.delete('/channels/:channelId', deleteChannel);

// Channel messages
router.get('/channels/:channelId/messages', getChannelMessages);
router.post('/channels/:channelId/messages', sendChannelMessage);
router.put('/channels/:channelId/messages/:messageId', updateMessage);
router.delete('/channels/:channelId/messages/:messageId', deleteMessage);

// Direct messages
router.get('/dm', getDirectMessages);
router.post('/dm', createDirectMessage);
router.delete('/dm/:conversationId', deleteDirectMessage);

router.get('/dm/:conversationId/messages', getDirectMessagesForUser);
router.post('/dm/:conversationId/messages', sendDirectMessage);
router.put('/dm/:conversationId/messages/:messageId', updateMessage);
router.delete('/dm/:conversationId/messages/:messageId', deleteMessage);

export default router;
