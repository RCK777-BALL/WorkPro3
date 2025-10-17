/*
 * SPDX-License-Identifier: MIT
 */

import { Types } from 'mongoose';
import type { FilterQuery } from 'mongoose';
import Channel, { ChannelDocument } from '../../models/Channel';
import ChatMessage, { ChatMessageDocument } from '../../models/ChatMessage';
import User from '../../models/User';
import type { AuthedRequestHandler } from '../../types/http';
import { sendResponse } from '../../utils/sendResponse';
import { resolveUserAndTenant } from './utils';
import logger from '../../utils/logger';
import type { Server } from 'socket.io';
import { buildChannelRoomId } from '../../socket/chatSocket';

const asObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value);

interface ChannelResponse {
  id: string;
  name: string;
  description?: string;
  topic?: string;
  isDirect: boolean;
  visibility: string;
  members: Array<{
    id: string;
    name: string;
    email?: string;
    roles: string[];
  }>;
  allowedRoles: string[];
  department?: string;
  lastMessageAt?: string;
  unreadCount: number;
  lastMessage?: {
    id: string;
    sender: string;
    content: string;
    plainText: string;
    createdAt: string;
    attachments: ChatMessageDocument['attachments'];
    threadRoot?: string;
  } | null;
  metadata?: Record<string, unknown>;
}

const mapChannel = (
  channel: ChannelDocument | (ChannelDocument & { _id: Types.ObjectId }),
  memberProfiles: Map<string, { id: string; name: string; email?: string; roles: string[] }>,
  stats?: { unreadCount: number; lastMessage?: ChatMessageDocument | null },
): ChannelResponse => {
  const members = channel.members
    .map((member) => memberProfiles.get(String(member)))
    .filter((value): value is { id: string; name: string; email?: string; roles: string[] } => Boolean(value));

  const lastMessage = stats?.lastMessage
    ? {
        id: String(stats.lastMessage._id),
        sender: String(stats.lastMessage.sender),
        content: stats.lastMessage.content,
        plainText: stats.lastMessage.plainText ?? stats.lastMessage.content,
        createdAt: stats.lastMessage.createdAt.toISOString(),
        attachments: stats.lastMessage.attachments,
        threadRoot: stats.lastMessage.threadRoot ? String(stats.lastMessage.threadRoot) : undefined,
      }
    : null;

  return {
    id: String(channel._id),
    name: channel.name,
    description: channel.description,
    topic: channel.topic,
    isDirect: channel.isDirect,
    visibility: channel.visibility,
    members,
    allowedRoles: channel.allowedRoles ?? [],
    department: channel.department ? String(channel.department) : undefined,
    lastMessageAt: (channel.lastMessageAt ?? channel.updatedAt)?.toISOString(),
    unreadCount: stats?.unreadCount ?? 0,
    lastMessage,
    metadata: channel.metadata as Record<string, unknown> | undefined,
  };
};

const buildChannelQuery = (
  tenantId: string,
  userId: string,
  roles: string[],
): FilterQuery<ChannelDocument> => ({
  tenantId,
  isArchived: false,
  $or: [
    { visibility: 'public' },
    { members: new Types.ObjectId(userId) },
  ],
  $expr: {
    $or: [
      { $eq: [{ $size: '$allowedRoles' }, 0] },
      { $gt: [{ $size: { $setIntersection: ['$allowedRoles', roles] } }, 0] },
    ],
  },
});

export const listChannels: AuthedRequestHandler = async (req, res, next) => {
  try {
    const resolved = resolveUserAndTenant(req, res);
    if (!resolved) return;
    const { userId, tenantId } = resolved;
    if (!userId || !tenantId) return;

    const roles = Array.isArray((req.user as any)?.roles)
      ? ((req.user as any)?.roles as string[])
      : ((req.user as any)?.role ? [(req.user as any)?.role as string] : []);

    const query = buildChannelQuery(tenantId, userId, roles);
    const channels = await Channel.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const memberIds = new Set<string>();
    channels.forEach((channel) => {
      channel.members?.forEach((member) => memberIds.add(String(member)));
    });

    const profiles = await User.find({ _id: { $in: Array.from(memberIds, asObjectId) } })
      .select('name email roles')
      .lean();
    const profileMap = new Map(
      profiles.map((profile) => [String(profile._id), {
        id: String(profile._id),
        name: profile.name,
        email: profile.email,
        roles: Array.isArray(profile.roles)
          ? profile.roles.map((role) => String(role))
          : (profile.role ? [String(profile.role)] : []),
      }]),
    );

    const channelIds = channels.map((channel) => channel._id).filter(Boolean) as Types.ObjectId[];
    let statsMap = new Map<string, { unreadCount: number; lastMessage?: ChatMessageDocument | null }>();

    if (channelIds.length) {
      const userObjectId = new Types.ObjectId(userId);
      const tenantObjectId = new Types.ObjectId(tenantId);

      const stats = await ChatMessage.aggregate<{
        _id: Types.ObjectId;
        lastMessage: ChatMessageDocument;
        unreadCount: number;
      }>([
        { $match: { channelId: { $in: channelIds }, tenantId: tenantObjectId } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$channelId',
            lastMessage: { $first: '$$ROOT' },
            unreadCount: {
              $sum: {
                $cond: [{ $in: [userObjectId, '$readBy'] }, 0, 1],
              },
            },
          },
        },
      ]);

      statsMap = new Map(
        stats.map((entry) => [
          String(entry._id),
          {
            unreadCount: entry.unreadCount,
            lastMessage: entry.lastMessage,
          },
        ]),
      );
    }

    const payload = channels.map((channel) =>
      mapChannel(channel as unknown as ChannelDocument, profileMap, statsMap.get(String(channel._id))),
    );

    sendResponse(res, payload);
  } catch (error) {
    next(error);
  }
};

interface CreateChannelBody {
  name: string;
  description?: string;
  topic?: string;
  visibility?: 'public' | 'private' | 'department';
  members?: string[];
  allowedRoles?: string[];
  department?: string;
  metadata?: Record<string, unknown>;
}

export const createChannel: AuthedRequestHandler<unknown, unknown, CreateChannelBody> = async (
  req,
  res,
  next,
) => {
  try {
    const resolved = resolveUserAndTenant(req, res);
    if (!resolved) return;
    const { userId, tenantId } = resolved;
    if (!userId || !tenantId) return;

    const {
      name,
      description,
      topic,
      visibility = 'private',
      members = [],
      allowedRoles = [],
      department,
      metadata,
    } = req.body;

    if (!name?.trim()) {
      sendResponse(res, null, 'Channel name is required', 400);
      return;
    }

    if (visibility === 'department' && !department) {
      sendResponse(res, null, 'Department is required for department channels', 400);
      return;
    }

    const uniqueMembers = Array.from(new Set([userId, ...members]))
      .filter(Boolean)
      .map((id) => new Types.ObjectId(id));

    const channel = await Channel.create({
      name: name.trim(),
      description,
      topic,
      visibility,
      members: visibility === 'public' ? [] : uniqueMembers,
      allowedRoles,
      department: department ? new Types.ObjectId(department) : undefined,
      createdBy: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      metadata,
      lastMessageAt: new Date(),
    });

    const profiles = await User.find({ _id: { $in: uniqueMembers } })
      .select('name email roles')
      .lean();

    const profileMap = new Map(
      profiles.map((profile) => [String(profile._id), {
        id: String(profile._id),
        name: profile.name,
        email: profile.email,
        roles: Array.isArray(profile.roles)
          ? profile.roles.map((role) => String(role))
          : (profile.role ? [String(profile.role)] : []),
      }]),
    );

    const response = mapChannel(channel, profileMap, { unreadCount: 0, lastMessage: null });

    const io: Server | undefined = req.app.get('io');
    if (io) {
      const room = buildChannelRoomId(String(channel.tenantId), String(channel._id));
      io.to(room).emit('chat:channel-created', response);
    }

    sendResponse(res, response, null, 201);
  } catch (error) {
    next(error);
  }
};

interface UpdateChannelBody {
  name?: string;
  description?: string;
  topic?: string;
  members?: string[];
  allowedRoles?: string[];
  visibility?: 'public' | 'private' | 'department';
  department?: string | null;
  metadata?: Record<string, unknown> | null;
  isArchived?: boolean;
}

export const updateChannel: AuthedRequestHandler<{ channelId: string }, unknown, UpdateChannelBody> = async (
  req,
  res,
  next,
) => {
  try {
    const resolved = resolveUserAndTenant(req, res);
    if (!resolved) return;
    const { userId, tenantId } = resolved;
    if (!tenantId) return;

    const { channelId } = req.params;
    const update: Partial<ChannelDocument> = {};

    const {
      name,
      description,
      topic,
      members,
      allowedRoles,
      visibility,
      department,
      metadata,
      isArchived,
    } = req.body;

    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description;
    if (topic !== undefined) update.topic = topic;
    if (visibility !== undefined) update.visibility = visibility;
    if (allowedRoles !== undefined) update.allowedRoles = allowedRoles;
    if (metadata !== undefined) update.metadata = metadata ?? undefined;
    if (typeof isArchived === 'boolean') update.isArchived = isArchived;

    if (department !== undefined) {
      update.department = department ? new Types.ObjectId(department) : undefined;
    }

    if (members !== undefined) {
      const uniqueMembers = Array.from(new Set([userId, ...members]))
        .filter(Boolean)
        .map((id) => new Types.ObjectId(id));
      update.members = uniqueMembers as unknown as ChannelDocument['members'];
    }

    const channel = await Channel.findOneAndUpdate(
      { _id: channelId, tenantId, isDirect: false },
      update,
      { new: true },
    );

    if (!channel) {
      sendResponse(res, null, 'Channel not found', 404);
      return;
    }

    const memberIds = channel.members.map((member) => String(member));
    const profiles = await User.find({ _id: { $in: memberIds.map(asObjectId) } })
      .select('name email roles')
      .lean();

    const profileMap = new Map(
      profiles.map((profile) => [String(profile._id), {
        id: String(profile._id),
        name: profile.name,
        email: profile.email,
        roles: Array.isArray(profile.roles)
          ? profile.roles.map((role) => String(role))
          : (profile.role ? [String(profile.role)] : []),
      }]),
    );

    const stats = await ChatMessage.findOne({ channelId: channel._id })
      .sort({ createdAt: -1 })
      .lean();

    const response = mapChannel(channel, profileMap, {
      unreadCount: 0,
      lastMessage: stats ?? null,
    });

    const io: Server | undefined = req.app.get('io');
    if (io) {
      const room = buildChannelRoomId(String(channel.tenantId), String(channel._id));
      io.to(room).emit('chat:channel-updated', response);
    }

    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export const archiveChannel: AuthedRequestHandler<{ channelId: string }> = async (req, res, next) => {
  try {
    const resolved = resolveUserAndTenant(req, res);
    if (!resolved) return;
    const { tenantId } = resolved;
    if (!tenantId) return;

    const { channelId } = req.params;
    const channel = await Channel.findOneAndUpdate(
      { _id: channelId, tenantId },
      { isArchived: true },
      { new: true },
    );

    if (!channel) {
      sendResponse(res, null, 'Channel not found', 404);
      return;
    }

    const io: Server | undefined = req.app.get('io');
    if (io) {
      const room = buildChannelRoomId(String(channel.tenantId), String(channel._id));
      io.to(room).emit('chat:channel-archived', { id: String(channel._id) });
    }

    sendResponse(res, { id: String(channel._id), archived: true });
  } catch (error) {
    logger.error('Failed to archive channel', error);
    next(error);
  }
};

export const getChannel: AuthedRequestHandler<{ channelId: string }> = async (req, res, next) => {
  try {
    const resolved = resolveUserAndTenant(req, res);
    if (!resolved) return;
    const { tenantId } = resolved;
    if (!tenantId) return;

    const { channelId } = req.params;
    const channel = await Channel.findOne({ _id: channelId, tenantId });
    if (!channel) {
      sendResponse(res, null, 'Channel not found', 404);
      return;
    }

    const memberIds = channel.members.map((member) => String(member));
    const profiles = await User.find({ _id: { $in: memberIds.map(asObjectId) } })
      .select('name email roles')
      .lean();

    const profileMap = new Map(
      profiles.map((profile) => [String(profile._id), {
        id: String(profile._id),
        name: profile.name,
        email: profile.email,
        roles: Array.isArray(profile.roles)
          ? profile.roles.map((role) => String(role))
          : (profile.role ? [String(profile.role)] : []),
      }]),
    );

    const stats = await ChatMessage.aggregate<{
      _id: Types.ObjectId;
      lastMessage: ChatMessageDocument;
      unreadCount: number;
    }>([
      { $match: { channelId: channel._id, tenantId: new Types.ObjectId(tenantId) } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$channelId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: { $sum: 0 },
        },
      },
    ]);

    const response = mapChannel(channel, profileMap, stats.length ? {
      unreadCount: stats[0].unreadCount,
      lastMessage: stats[0].lastMessage,
    } : undefined);

    sendResponse(res, response);
  } catch (error) {
    next(error);
  }
};

export default {
  listChannels,
  createChannel,
  updateChannel,
  archiveChannel,
  getChannel,
};
