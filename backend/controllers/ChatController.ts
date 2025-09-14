/*
 * SPDX-License-Identifier: MIT
 */

import { Response } from 'express';
import Channel from '../models/Channel';
import ChatMessage, { ChatMessageDocument } from '../models/ChatMessage';
import type { AuthedRequestHandler } from '../types/http';
import { resolveUserAndTenant } from './chat/utils';
import { Document, Types } from 'mongoose';
import { sendResponse } from '../utils/sendResponse';

// Channel controllers
export const getChannels: AuthedRequestHandler = async (req: any, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const channels = await Channel.find({
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
};

export const createChannel: AuthedRequestHandler = async (req: { body: { name: any; description: any; members?: never[] | undefined; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const { name, description, members = [] } = req.body;
    const channel = await Channel.create({
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
};

export const updateChannel: AuthedRequestHandler = async (req: { body: { name: any; description: any; members: any; }; params: { channelId: any; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const { name, description, members } = req.body;
    const update: Partial<{ name: string; description?: string; members?: string[] }> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (members !== undefined) update.members = members;
    const channel = await Channel.findOneAndUpdate(
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
};

export const deleteChannel: AuthedRequestHandler = async (req: { params: { channelId: any; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
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
    sendResponse(res, null, null, 204);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getChannelMessages: AuthedRequestHandler = async (req: { params: { channelId: any; }; }, res: { json: (arg0: (Document<unknown, {}, ChatMessageDocument, {}, {}> & ChatMessageDocument & Required<{ _id: Types.ObjectId; }> & { __v: number; })[]) => void; }, next: (arg0: unknown) => void) => {
  try {
    const messages = await ChatMessage.find({ channelId: req.params.channelId }).sort({ createdAt: 1 });
    sendResponse(res, messages);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const sendChannelMessage: AuthedRequestHandler = async (req: { body: { content: any; }; params: { channelId: any; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const ids = resolveUserAndTenant(req, res, { requireTenant: false });
    if (!ids) return;
    const { userId } = ids;
    const { content } = req.body;
    const message = await ChatMessage.create({
      channelId: req.params.channelId,
      sender: userId,
      content,
    });
    sendResponse(res, message, null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

// Message controllers shared between channel and direct messages
export const updateMessage: AuthedRequestHandler = async (req: { params: { messageId: any; }; body: { content: any; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const ids = resolveUserAndTenant(req, res, { requireTenant: false });
    if (!ids) return;
    const { userId } = ids;
    const message = await ChatMessage.findOneAndUpdate(
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
};

export const deleteMessage: AuthedRequestHandler = async (req: { params: { messageId: any; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const ids = resolveUserAndTenant(req, res, { requireTenant: false });
    if (!ids) return;
    const { userId } = ids;
    await ChatMessage.findOneAndDelete({ _id: req.params.messageId, sender: userId });
    sendResponse(res, null, null, 204);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

// Direct message controllers
export const getDirectMessages: AuthedRequestHandler = async (req: any, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const channels = await Channel.find({
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
};

export const createDirectMessage: AuthedRequestHandler = async (req: { body: { userId: any; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const otherId = req.body.userId;
    const members = [userId, otherId];
    const existing = await Channel.findOne({
      tenantId,
      isDirect: true,
      members: { $all: members },
    });
    if (existing) {
      sendResponse(res, existing);
      return;
    }
    const channel = await Channel.create({
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
};

export const deleteDirectMessage: AuthedRequestHandler = async (req: { params: { conversationId: any; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
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
    sendResponse(res, null, null, 204);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const getDirectMessagesForUser: AuthedRequestHandler = async (req: { params: { conversationId: any; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const channel = await Channel.findOne({
      _id: req.params.conversationId,
      tenantId,
      isDirect: true,
      members: userId,
    });
    if (!channel) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const messages = await ChatMessage.find({ channelId: channel._id }).sort({ createdAt: 1 });
    sendResponse(res, messages);
    return;
  } catch (err) {
    next(err);
    return;
  }
};

export const sendDirectMessage: AuthedRequestHandler = async (req: { params: { conversationId: any; }; body: { content: any; }; }, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void) => {
  try {
    const ids = resolveUserAndTenant(req, res);
    if (!ids) return;
    const { userId, tenantId } = ids;
    const channel = await Channel.findOne({
      _id: req.params.conversationId,
      tenantId,
      isDirect: true,
      members: userId,
    });
    if (!channel) {
      sendResponse(res, null, 'Not found', 404);
      return;
    }
    const message = await ChatMessage.create({
      channelId: channel._id,
      sender: userId!,
      content: req.body.content,
    });
    sendResponse(res, message, null, 201);
    return;
  } catch (err) {
    next(err);
    return;
  }
};
