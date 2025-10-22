/*
 * SPDX-License-Identifier: MIT
 */

import type { NextFunction, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import Channel, { ChannelDocument } from '../models/Channel';
import ChatMessage, { ChatMessageDocument } from '../models/ChatMessage';
import type { AuthedRequest } from '../types/http';
import { resolveUserAndTenant } from './chat/utils';
import { sendResponse } from '../utils/sendResponse';

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
}

interface CreateDirectMessageBody {
  userId: string;
}

// Channel controllers
export async function getChannels(
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
      members: userId,
    }).sort({ name: 1 });
    sendResponse(res, channels);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function createChannel(
  req: AuthedRequest<ParamsDictionary, unknown, CreateChannelBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const { name, description, members = [] } = req.body;
    const channel: ChannelDocument = await Channel.create({
      name,
      description,
      members: Array.from(new Set([userId, ...members])),
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

export async function updateChannel(
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

export async function deleteChannel(
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

export async function getChannelMessages(
  req: AuthedRequest<ChannelIdParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res, { requireUser: false });
    if (!ids?.tenantId) return;
    const messages: ChatMessageDocument[] = await ChatMessage.find({
      channelId: req.params.channelId,
      tenantId: ids.tenantId,
    }).sort({ createdAt: 1 });
    sendResponse(res, messages);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function sendChannelMessage(
  req: AuthedRequest<ChannelIdParams, unknown, MessageBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const { content } = req.body;
    const message: ChatMessageDocument = await ChatMessage.create({
      channelId: req.params.channelId,
      sender: userId,
      tenantId: tenantId!,
      content,
      plainText: content,
    });
    sendResponse(res, message, null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

// Message controllers shared between channel and direct messages
export async function updateMessage(
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

export async function deleteMessage(
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
export async function getDirectMessages(
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
    });
    sendResponse(res, channels);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function createDirectMessage(
  req: AuthedRequest<ParamsDictionary, unknown, CreateDirectMessageBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const otherId = req.body.userId;
    const members = [userId, otherId];
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

export async function deleteDirectMessage(
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

export async function getDirectMessagesForUser(
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
    const messages: ChatMessageDocument[] = await ChatMessage.find({ channelId: channel._id }).sort({ createdAt: 1 });
    sendResponse(res, messages);
    return;
  } catch (err) {
    next(err);
    return;
  }
}

export async function sendDirectMessage(
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
      content: req.body.content,
      plainText: req.body.content,
    });
    sendResponse(res, message, null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
}
