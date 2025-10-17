/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import ChatMessage, { ChatMessageDocument, ChatAttachment } from '../../models/ChatMessage';
import Channel from '../../models/Channel';
import Notification from '../../models/Notifications';
import User from '../../models/User';
import type { AuthedRequestHandler } from '../../types/http';
import { sendResponse } from '../../utils/sendResponse';
import { resolveUserAndTenant } from './utils';
import { buildChannelRoomId } from '../../socket/chatSocket';
import type { Server } from 'socket.io';
import logger from '../../utils/logger';
import { assertEmail } from '../../utils/assert';
import nodemailer from 'nodemailer';
import { enqueueEmailRetry } from '../../utils/emailQueue';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const sanitizeContent = (value: string): string => escapeHtml(value).replace(/\n/g, '<br />');

interface MessageListQuery {
  channelId?: string;
  threadRoot?: string;
  limit?: string;
  before?: string;
}

const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value);

const toMessageResponse = (message: ChatMessageDocument) => ({
  id: String(message._id),
  channelId: String(message.channelId),
  tenantId: String(message.tenantId),
  sender: String(message.sender),
  content: message.content,
  plainText: message.plainText,
  attachments: message.attachments,
  mentions: message.mentions?.map((mention) => String(mention)) ?? [],
  reactions: message.reactions?.map((reaction) => ({
    emoji: reaction.emoji,
    users: reaction.users.map((user) => String(user)),
    createdAt: reaction.createdAt,
  })) ?? [],
  threadRoot: message.threadRoot ? String(message.threadRoot) : undefined,
  readBy: message.readBy?.map((user) => String(user)) ?? [],
  metadata: message.metadata ?? undefined,
  createdAt: message.createdAt.toISOString(),
  updatedAt: message.updatedAt.toISOString(),
});

const ensureChannelAccess = async (
  tenantId: string,
  channelId: string,
  userId: string,
): Promise<Channel | null> => {
  const channel = await Channel.findOne({
    _id: channelId,
    tenantId: new Types.ObjectId(tenantId),
    isArchived: false,
  });

  if (!channel) return null;

  const isPublic = channel.visibility === 'public';
  const isMember = channel.members.some((member) => String(member) === userId);
  if (!isPublic && !isMember) {
    return null;
  }

  return channel;
};

const deliverMentionNotifications = async (
  tenantId: string,
  senderId: string,
  message: ChatMessageDocument,
  mentionIds: Types.ObjectId[],
  io?: Server,
) => {
  if (!mentionIds.length) return;
  const uniqueMentions = Array.from(
    new Set(
      mentionIds.map((mention) => mention.toString()).filter((id) => id !== senderId),
    ),
  );
  if (!uniqueMentions.length) return;

  const notificationDocs = await Promise.all(
    uniqueMentions.map(async (userId) =>
      Notification.create({
        title: 'You were mentioned in chat',
        message: message.plainText || message.content,
        type: 'info',
        tenantId: new Types.ObjectId(tenantId),
        user: new Types.ObjectId(userId),
      }),
    ),
  );

  if (io) {
    notificationDocs.forEach((doc) => {
      io.to(String(doc.user)).emit('notification', doc.toObject());
    });
  }

  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const users = await User.find({ _id: { $in: uniqueMentions.map((id) => new Types.ObjectId(id)) } })
        .select('email name')
        .lean();

      await Promise.all(
        users.map(async (user) => {
          if (!user.email) return;
          try {
            assertEmail(user.email);
            await transporter.sendMail({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: user.email,
              subject: 'WorkPro3 Chat Mention',
              text: `${message.plainText || message.content}\n\nSent from WorkPro3 Chat`,
            });
          } catch (err) {
            logger.error('Failed to send mention email', err);
            void enqueueEmailRetry({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: user.email,
              subject: 'WorkPro3 Chat Mention',
              text: `${message.plainText || message.content}\n\nSent from WorkPro3 Chat`,
            });
          }
        }),
      );
    }
  } catch (err) {
    logger.error('Mention notification delivery failed', err);
  }
};

export const listMessages: AuthedRequestHandler<unknown, unknown, unknown, MessageListQuery> = async (
  req,
  res,
  next,
) => {
  try {
    const resolved = resolveUserAndTenant(req, res);
    if (!resolved) return;
    const { tenantId, userId } = resolved;
    if (!tenantId || !userId) return;

    const { channelId, threadRoot, limit = '50', before } = req.query;
    if (!channelId) {
      sendResponse(res, null, 'channelId is required', 400);
      return;
    }

    const channel = await ensureChannelAccess(tenantId, channelId, userId);
    if (!channel) {
      sendResponse(res, null, 'Channel not found', 404);
      return;
    }

    const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 200);

    const filter: Record<string, unknown> = {
      channelId: new Types.ObjectId(channelId),
      tenantId: new Types.ObjectId(tenantId),
    };

    if (threadRoot) {
      filter.$or = [
        { _id: new Types.ObjectId(threadRoot) },
        { threadRoot: new Types.ObjectId(threadRoot) },
      ];
    }

    if (before) {
      const cursorDate = new Date(before);
      if (!Number.isNaN(cursorDate.getTime())) {
        filter.createdAt = { $lt: cursorDate };
      }
    }

    const messages = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .lean();

    const userObjectId = new Types.ObjectId(userId);
    const unreadIds = messages
      .filter((message) => !message.readBy?.some((reader) => String(reader) === userId))
      .map((message) => message._id);

    if (unreadIds.length) {
      await ChatMessage.updateMany(
        { _id: { $in: unreadIds } },
        { $addToSet: { readBy: userObjectId } },
      );
    }

    const response = messages
      .map((message) => toMessageResponse(message as unknown as ChatMessageDocument))
      .reverse();

    sendResponse(res, {
      items: response,
      hasMore: messages.length === parsedLimit,
    });
  } catch (error) {
    next(error);
  }
};

interface AttachmentPayload {
  name: string;
  size: number;
  mimeType: string;
  url: string;
  tempKey?: string;
}

interface CreateMessageBody {
  channelId: string;
  content: string;
  plainText?: string;
  attachments?: AttachmentPayload[];
  mentions?: string[];
  metadata?: Record<string, unknown>;
  threadRoot?: string;
}

export const createMessage: AuthedRequestHandler<unknown, unknown, CreateMessageBody> = async (
  req,
  res,
  next,
) => {
  try {
    const resolved = resolveUserAndTenant(req, res);
    if (!resolved) return;
    const { tenantId, userId } = resolved;
    if (!tenantId || !userId) return;

    const {
      channelId,
      content,
      plainText,
      attachments = [],
      mentions = [],
      metadata,
      threadRoot,
    } = req.body;

    if (!channelId) {
      sendResponse(res, null, 'channelId is required', 400);
      return;
    }
    if (!content?.trim()) {
      sendResponse(res, null, 'content is required', 400);
      return;
    }

    const channel = await ensureChannelAccess(tenantId, channelId, userId);
    if (!channel) {
      sendResponse(res, null, 'Channel not found', 404);
      return;
    }

    const sanitized = sanitizeContent(content);
    const plain = plainText?.trim() || content.replace(/\s+/g, ' ').trim();

    let threadRootId: Types.ObjectId | undefined;
    if (threadRoot) {
      const threadMessage = await ChatMessage.findOne({
        _id: threadRoot,
        channelId,
        tenantId: new Types.ObjectId(tenantId),
      });
      if (!threadMessage) {
        sendResponse(res, null, 'Thread root not found', 404);
        return;
      }
      threadRootId = threadMessage.threadRoot ?? threadMessage._id;
    }

    const mentionIds = mentions
      .map((mention) => {
        try {
          return new Types.ObjectId(mention);
        } catch {
          return undefined;
        }
      })
      .filter((value): value is Types.ObjectId => Boolean(value));

    const attachmentDocs: ChatAttachment[] = attachments.map((attachment) => ({
      _id: new Types.ObjectId(),
      name: attachment.name,
      size: attachment.size,
      mimeType: attachment.mimeType,
      url: attachment.url,
      uploadedBy: new Types.ObjectId(userId),
    }));

    const message = await ChatMessage.create({
      channelId: new Types.ObjectId(channelId),
      tenantId: new Types.ObjectId(tenantId),
      sender: new Types.ObjectId(userId),
      content: sanitized,
      plainText: plain,
      attachments: attachmentDocs,
      mentions: mentionIds,
      metadata,
      threadRoot: threadRootId,
      readBy: [new Types.ObjectId(userId)],
    });

    await Channel.findByIdAndUpdate(channel._id, {
      lastMessageAt: message.createdAt,
      $addToSet: { members: new Types.ObjectId(userId) },
    }).exec();

    const io: Server | undefined = req.app.get('io');
    const response = toMessageResponse(message);
    if (io) {
      const room = buildChannelRoomId(tenantId, channelId);
      io.to(room).emit('chat:message', response);
    }

    await deliverMentionNotifications(tenantId, userId, message, mentionIds, io);

    sendResponse(res, response, null, 201);
  } catch (error) {
    next(error);
  }
};

export const reactToMessage: AuthedRequestHandler<{ messageId: string }, unknown, { emoji: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const resolved = resolveUserAndTenant(req, res);
    if (!resolved) return;
    const { tenantId, userId } = resolved;
    if (!tenantId || !userId) return;

    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) {
      sendResponse(res, null, 'emoji is required', 400);
      return;
    }

    const message = await ChatMessage.findOne({ _id: messageId, tenantId });
    if (!message) {
      sendResponse(res, null, 'Message not found', 404);
      return;
    }

    const userObjectId = new Types.ObjectId(userId);
    const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
    if (existing) {
      if (!existing.users.some((id) => id.equals(userObjectId))) {
        existing.users.push(userObjectId);
      }
    } else {
      message.reactions.push({
        emoji,
        users: [userObjectId],
        createdAt: new Date(),
      });
    }
    message.markModified('reactions');
    await message.save();

    const response = toMessageResponse(message);
    const io: Server | undefined = req.app.get('io');
    if (io) {
      const room = buildChannelRoomId(String(message.tenantId), String(message.channelId));
      io.to(room).emit('chat:reaction', {
        messageId: String(message._id),
        emoji,
        users: response.reactions.find((reaction) => reaction.emoji === emoji)?.users ?? [],
      });
    }

    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const removeReaction: AuthedRequestHandler<{ messageId: string }, unknown, { emoji: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const resolved = resolveUserAndTenant(req, res);
    if (!resolved) return;
    const { tenantId, userId } = resolved;
    if (!tenantId || !userId) return;

    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) {
      sendResponse(res, null, 'emoji is required', 400);
      return;
    }

    const message = await ChatMessage.findOne({ _id: messageId, tenantId });
    if (!message) {
      sendResponse(res, null, 'Message not found', 404);
      return;
    }

    const userObjectId = new Types.ObjectId(userId);
    const reaction = message.reactions.find((item) => item.emoji === emoji);
    if (!reaction) {
      sendResponse(res, null, 'Reaction not found', 404);
      return;
    }

    reaction.users = reaction.users.filter((id) => !id.equals(userObjectId));
    if (reaction.users.length === 0) {
      message.reactions = message.reactions.filter((item) => item.emoji !== emoji);
    }
    message.markModified('reactions');
    await message.save();

    const io: Server | undefined = req.app.get('io');
    if (io) {
      const room = buildChannelRoomId(String(message.tenantId), String(message.channelId));
      io.to(room).emit('chat:reaction-removed', {
        messageId: String(message._id),
        emoji,
        users: reaction.users.map((user) => String(user)),
      });
    }

    sendResponse(res, toMessageResponse(message));
  } catch (error) {
    next(error);
  }
};

export const markMessageRead: AuthedRequestHandler<{ messageId: string }> = async (
  req,
  res,
  next,
) => {
  try {
    const resolved = resolveUserAndTenant(req, res);
    if (!resolved) return;
    const { tenantId, userId } = resolved;
    if (!tenantId || !userId) return;

    const { messageId } = req.params;
    const userObjectId = new Types.ObjectId(userId);

    const message = await ChatMessage.findOneAndUpdate(
      { _id: messageId, tenantId },
      { $addToSet: { readBy: userObjectId } },
      { new: true },
    );

    if (!message) {
      sendResponse(res, null, 'Message not found', 404);
      return;
    }

    const io: Server | undefined = req.app.get('io');
    if (io) {
      const room = buildChannelRoomId(String(message.tenantId), String(message.channelId));
      io.to(room).emit('chat:read', {
        messageId: String(message._id),
        userId,
      });
    }

    sendResponse(res, toMessageResponse(message));
  } catch (error) {
    next(error);
  }
};

export default {
  listMessages,
  createMessage,
  reactToMessage,
  removeReaction,
  markMessageRead,
};
