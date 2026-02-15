/*
 * SPDX-License-Identifier: MIT
 */

import type { Express, NextFunction, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import Channel, { ChannelDocument } from '../models/Channel';
import ChatMessage, {
  ChatAttachment,
  ChatAttachmentInput,
  ChatMessageDocument,
} from '../models/ChatMessage';
import type { AuthedRequest } from '../types/http';
import { resolveUserAndTenant } from './chat/utils';
import type { UserDocument } from '../models/User';
import { Types } from 'mongoose';
import { buildChannelRoomId } from '../socket/chatSocket';
import fs from 'fs/promises';
import path from 'path';
import { sendResponse } from '../utils';

type ChannelIdParams = ParamsDictionary & { channelId: string };
type MessageIdParams = ParamsDictionary & { messageId: string };
type ConversationIdParams = ParamsDictionary & { conversationId: string };

interface CreateChannelBody {
  name: string;
  description?: string;
  members?: string[];
}

type UpdateChannelBody = Partial<{
  name: string;
  description: string;
  members: string[];
}>;

interface MessageBody {
  content: string;
  attachments?: AttachmentBody[];
}

interface CreateDirectMessageBody {
  userId: string;
}

interface AttachmentBody {
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy?: string;
}

interface ChatMessageResponse {
  id: string;
  channelId: string;
  content: string;
  plainText: string;
  attachments: ChatAttachment[];
  readBy: string[];
  sender: { id: string; name: string; email?: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

const CHAT_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'chat');
let chatUploadEnsured = false;

const ensureChatUploadDir = async () => {
  if (chatUploadEnsured) return;
  await fs.mkdir(CHAT_UPLOAD_DIR, { recursive: true });
  chatUploadEnsured = true;
};

const isUserDocument = (value: unknown): value is UserDocument =>
  Boolean(value) && typeof value === 'object' && 'name' in (value as Record<string, unknown>);

const normalizeMessage = (message: ChatMessageDocument): ChatMessageResponse => {
  let sender: ChatMessageResponse['sender'];

  if (isUserDocument(message.sender)) {
    sender = {
      id: String(message.sender._id),
      name: message.sender.name,
      email: message.sender.email ?? undefined,
    };
  } else if (message.sender) {
    sender = {
      id: String(message.sender),
      name: 'Unknown',
    };
  } else {
    sender = null;
  }

  return {
    id: String(message._id),
    channelId: String(message.channelId),
    content: message.content,
    plainText: message.plainText,
    attachments: message.attachments ?? [],
    readBy: (message.readBy ?? []).map((id) => String(id)),
    sender,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
};

const pushMessageToRoom = (
  req: AuthedRequest,
  tenantId: string,
  channelId: Types.ObjectId,
  message: ChatMessageDocument,
) => {
  const io = req.app.get('io');
  if (!io) return;
  const room = buildChannelRoomId(tenantId, channelId.toString());
  io.to(room).emit('chat:message', {
    channelId: channelId.toString(),
    message: normalizeMessage(message),
  });
};

const formatMember = (member: Types.ObjectId | UserDocument) =>
  isUserDocument(member)
    ? { id: String(member._id), name: member.name, email: member.email }
    : { id: String(member), name: 'Unknown', email: undefined };

const normalizeMemberIds = (
  memberIds: Array<string | Types.ObjectId | undefined | null>,
): Types.ObjectId[] => {
  const normalized = memberIds
    .map((memberId) => {
      if (!memberId) return null;
      if (memberId instanceof Types.ObjectId) return memberId;
      return Types.ObjectId.isValid(memberId) ? new Types.ObjectId(memberId) : null;
    })
    .filter((memberId): memberId is Types.ObjectId => memberId instanceof Types.ObjectId);

  return Array.from(new Map(normalized.map((id) => [id.toString(), id])).values());
};

const isPinnedByUser = (channel: ChannelDocument, userId?: Types.ObjectId) => {
  if (!userId) return false;
  const metadata = channel.metadata as { pinnedBy?: Types.ObjectId[] } | undefined;
  if (!metadata?.pinnedBy) return false;
  return metadata.pinnedBy.some((id) => id instanceof Types.ObjectId && id.equals(userId));
};

const markConversationRead = async (
  channelId: Types.ObjectId | string,
  tenantId: string,
  userId?: Types.ObjectId,
) => {
  if (!userId) return 0;
  const result = await ChatMessage.updateMany(
    { channelId, tenantId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } },
  );

  const modifiedCount = (result as { modifiedCount?: number }).modifiedCount;
  if (typeof modifiedCount === 'number') {
    return modifiedCount;
  }

  const legacyModified = (result as { nModified?: number }).nModified;
  if (typeof legacyModified === 'number') {
    return legacyModified;
  }

  return 0;
};

async function uploadChatAttachment(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    await ensureChatUploadDir();

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      sendResponse(res, null, 'No file uploaded', 400);
      return;
    }

    const relative = path.join('chat', file.filename).replace(/\\+/g, '/');
    sendResponse(
      res,
      {
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        url: `/static/uploads/${relative}`,
        uploadedBy: ids.userId ? String(ids.userId) : undefined,
      },
      null,
      201,
    );
    return;
  } catch (err) {
    next(err);
    return;
  }
}
// Channel controllers
async function getChannels(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const channels: ChannelDocument[] = await Channel.find({
      tenantId,
      isDirect: false,
      isArchived: false,
      members: userId,
    })
      .populate('members', 'name email')
      .sort({ name: 1 });

    const enriched = await Promise.all(
      channels.map(async (channel) => {
        const [lastMessage, unreadCount] = await Promise.all([
          ChatMessage.findOne({ channelId: channel._id, tenantId })
            .sort({ createdAt: -1 })
            .populate('sender', 'name email'),
          ChatMessage.countDocuments({
            channelId: channel._id,
            tenantId,
            readBy: { $ne: userId },
          }),
        ]);

        return {
          id: String(channel._id),
          name: channel.name,
          description: channel.description ?? '',
          isDirect: channel.isDirect,
          members: channel.members.map((member) => formatMember(member as Types.ObjectId | UserDocument)),
          unreadCount,
          pinned: isPinnedByUser(channel, userId),
          lastMessage: lastMessage ? normalizeMessage(lastMessage) : null,
          lastMessageAt: lastMessage?.createdAt ?? channel.lastMessageAt ?? channel.updatedAt,
        };
      }),
    );

    sendResponse(res, enriched);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function createChannel(
  req: AuthedRequest<ParamsDictionary, unknown, CreateChannelBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const { name, description, members = [] } = req.body;
    const normalizedMembers = normalizeMemberIds([userId, ...members]);
    const channel: ChannelDocument = await Channel.create({
      name,
      description,
      members: normalizedMembers,
      createdBy: userId,
      tenantId,
      isDirect: false,
    });
    sendResponse(res, channel, null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function updateChannel(
  req: AuthedRequest<ChannelIdParams, unknown, UpdateChannelBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const { name, description, members } = req.body;
    const update: UpdateChannelBody = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (members !== undefined) update.members = members;
    const channel: ChannelDocument | null = await Channel.findOneAndUpdate(
      {
        _id: req.params.channelId,
        tenantId,
        isDirect: false,
        members: userId,
      },
      update,
      { new: true }
    );
    if (!channel) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, channel);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function deleteChannel(
  req: AuthedRequest<ChannelIdParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res, { requireUser: false });
    if (!ids) return;
    const { tenantId } = ids;
    await Channel.findOneAndDelete({
      _id: req.params.channelId,
      tenantId,
      isDirect: false,
    });
    await ChatMessage.deleteMany({ channelId: req.params.channelId });
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function getChannelMessages(
  req: AuthedRequest<ChannelIdParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res, { requireUser: false });
    if (!ids?.tenantId) return;
    const { tenantId } = ids;

    const { q, limit: limitRaw, before } = req.query as {
      q?: string;
      limit?: string;
      before?: string;
    };

    const filter: Record<string, unknown> = {
      channelId: req.params.channelId,
      tenantId,
    };

    if (q) {
      filter.$text = { $search: q };
    }

    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const limit = Number.parseInt(limitRaw ?? '', 10);
    const query = ChatMessage.find(filter)
      .sort({ createdAt: 1 })
      .populate('sender', 'name email');

    if (!Number.isNaN(limit) && limit > 0) {
      query.limit(limit);
    }

    const messages = await query.exec();

    sendResponse(
      res,
      messages.map((message) => normalizeMessage(message)),
    );
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function sendChannelMessage(
  req: AuthedRequest<ChannelIdParams, unknown, MessageBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const { content, attachments: attachmentPayload = [] } = req.body;

    if (!content && (!Array.isArray(attachmentPayload) || attachmentPayload.length === 0)) {
      sendResponse(res, null, 'Message content or attachment required', 400);
      return;
    }

    const attachments: ChatAttachmentInput[] = Array.isArray(attachmentPayload)
      ? attachmentPayload
          .filter((attachment) => typeof attachment?.url === 'string')
          .map((attachment) => {
            const uploadedBy =
              typeof attachment.uploadedBy === 'string'
                ? new Types.ObjectId(attachment.uploadedBy)
                : userId;
            return {
              name: attachment.name ?? 'attachment',
              url: attachment.url,
              size: Number(attachment.size ?? 0),
              mimeType: attachment.mimeType ?? 'application/octet-stream',
              uploadedBy: uploadedBy!,
            };
          })
      : [];

    const message: ChatMessageDocument = await ChatMessage.create({
      channelId: req.params.channelId,
      sender: userId!,
      tenantId: tenantId!,
      content: content ?? '',
      plainText: content ?? '',
      attachments,
      readBy: userId ? [userId] : [],
    });

    await message.populate('sender', 'name email');
    await Channel.findByIdAndUpdate(req.params.channelId, { lastMessageAt: new Date() });

    pushMessageToRoom(req, tenantId!, message.channelId as Types.ObjectId, message);

    sendResponse(res, normalizeMessage(message), null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function markChannelRead(
  req: AuthedRequest<ChannelIdParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const updated = await markConversationRead(req.params.channelId, tenantId!, userId);
    sendResponse(res, { updated });
    return;
  } catch (err) {
    next(err);
    return;
  }
}

// Message controllers shared between channel and direct messages
async function updateMessage(
  req: AuthedRequest<MessageIdParams, unknown, MessageBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res, { requireTenant: false });
    if (!ids) return;
    const { userId } = ids;
    const message: ChatMessageDocument | null = await ChatMessage.findOneAndUpdate(
      { _id: req.params.messageId, sender: userId },
      { content: req.body.content, updatedAt: new Date() },
      { new: true }
    );
    if (!message) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    sendResponse(res, message);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function deleteMessage(
  req: AuthedRequest<MessageIdParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res, { requireTenant: false });
    if (!ids) return;
    const { userId } = ids;
    await ChatMessage.findOneAndDelete({ _id: req.params.messageId, sender: userId });
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
}

// Direct message controllers
async function getDirectMessages(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const channels: ChannelDocument[] = await Channel.find({
      tenantId,
      isDirect: true,
      members: userId,
    })
      .populate('members', 'name email')
      .sort({ updatedAt: -1 });

    const enriched = await Promise.all(
      channels.map(async (channel) => {
        const [lastMessage, unreadCount] = await Promise.all([
          ChatMessage.findOne({ channelId: channel._id, tenantId })
            .sort({ createdAt: -1 })
            .populate('sender', 'name email'),
          ChatMessage.countDocuments({
            channelId: channel._id,
            tenantId,
            readBy: { $ne: userId },
          }),
        ]);

        return {
          id: String(channel._id),
          isDirect: channel.isDirect,
          members: channel.members.map((member) => formatMember(member as Types.ObjectId | UserDocument)),
          unreadCount,
          lastMessage: lastMessage ? normalizeMessage(lastMessage) : null,
          lastMessageAt: lastMessage?.createdAt ?? channel.lastMessageAt ?? channel.updatedAt,
        };
      }),
    );

    sendResponse(res, enriched);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function createDirectMessage(
  req: AuthedRequest<ParamsDictionary, unknown, CreateDirectMessageBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const otherId = req.body.userId;
    const members = normalizeMemberIds([userId, otherId]);
    const existing: ChannelDocument | null = await Channel.findOne({
      tenantId,
      isDirect: true,
      members: { $all: members },
    });
    if (existing) {
      sendResponse(res, existing);
      return;
    }
    const channel: ChannelDocument = await Channel.create({
      name: '',
      isDirect: true,
      members,
      createdBy: userId!,
      tenantId,
    });
    sendResponse(res, channel, null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function deleteDirectMessage(
  req: AuthedRequest<ConversationIdParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    await Channel.findOneAndDelete({
      _id: req.params.conversationId,
      tenantId,
      isDirect: true,
      members: userId,
    });
    await ChatMessage.deleteMany({ channelId: req.params.conversationId });
    sendResponse(res, { message: 'Deleted successfully' });
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function getDirectMessagesForUser(
  req: AuthedRequest<ConversationIdParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const channel: ChannelDocument | null = await Channel.findOne({
      _id: req.params.conversationId,
      tenantId,
      isDirect: true,
      members: userId,
    });
    if (!channel) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const { q, limit: limitRaw, before } = req.query as {
      q?: string;
      limit?: string;
      before?: string;
    };

    const filter: Record<string, unknown> = {
      channelId: channel._id,
      tenantId,
    };

    if (q) filter.$text = { $search: q };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const limit = Number.parseInt(limitRaw ?? '', 10);
    const query = ChatMessage.find(filter)
      .sort({ createdAt: 1 })
      .populate('sender', 'name email');

    if (!Number.isNaN(limit) && limit > 0) query.limit(limit);

    const messages = await query.exec();
    sendResponse(
      res,
      messages.map((message) => normalizeMessage(message)),
    );
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function sendDirectMessage(
  req: AuthedRequest<ConversationIdParams, unknown, MessageBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const channel: ChannelDocument | null = await Channel.findOne({
      _id: req.params.conversationId,
      tenantId,
      isDirect: true,
      members: userId,
    });
    if (!channel) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const message: ChatMessageDocument = await ChatMessage.create({
      channelId: channel._id,
      sender: userId!,
      tenantId: tenantId!,
      content: req.body.content ?? '',
      plainText: req.body.content ?? '',
      attachments: Array.isArray(req.body.attachments)
        ? req.body.attachments
            .filter((attachment) => typeof attachment?.url === 'string')
            .map((attachment) => {
              const uploadedBy =
                typeof attachment.uploadedBy === 'string'
                  ? new Types.ObjectId(attachment.uploadedBy)
                  : userId;
              return {
                name: attachment.name ?? 'attachment',
                url: attachment.url,
                size: Number(attachment.size ?? 0),
                mimeType: attachment.mimeType ?? 'application/octet-stream',
                uploadedBy: uploadedBy!,
              };
            })
        : [],
      readBy: userId ? [userId] : [],
    });
    await message.populate('sender', 'name email');
    await Channel.findByIdAndUpdate(channel._id, { lastMessageAt: new Date() });

    pushMessageToRoom(req, tenantId!, message.channelId as Types.ObjectId, message);

    sendResponse(res, normalizeMessage(message), null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

async function markDirectConversationRead(
  req: AuthedRequest<ConversationIdParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const channel = await Channel.findOne({
      _id: req.params.conversationId,
      tenantId,
      isDirect: true,
      members: userId,
    }).select('_id');

    if (!channel) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }

    const updated = await markConversationRead(channel._id, tenantId!, userId);
    sendResponse(res, { updated });
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export {
  uploadChatAttachment,
  getChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getChannelMessages,
  sendChannelMessage,
  markChannelRead,
  updateMessage,
  deleteMessage,
  getDirectMessages,
  createDirectMessage,
  deleteDirectMessage,
  getDirectMessagesForUser,
  sendDirectMessage,
  markDirectConversationRead,
};
