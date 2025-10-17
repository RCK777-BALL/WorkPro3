/*
 * SPDX-License-Identifier: MIT
 */

import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import User from '../models/User';
import Channel from '../models/Channel';

interface DecodedToken {
  id?: string;
  tenantId?: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

export function buildChannelRoomId(tenantId: string, channelId: string): string {
  return `tenant:${tenantId}:channel:${channelId}`;
}

const presenceByRoom = new Map<string, Set<string>>();

const getPresenceSet = (room: string): Set<string> => {
  if (!presenceByRoom.has(room)) {
    presenceByRoom.set(room, new Set());
  }
  return presenceByRoom.get(room)!;
};

async function authorizeSocket(socket: Socket): Promise<void> {
  const token =
    (typeof socket.handshake.auth?.token === 'string' && socket.handshake.auth?.token) ||
    (typeof socket.handshake.headers.authorization === 'string'
      ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
      : undefined);

  if (!token) {
    throw new Error('Missing token');
  }

  const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;
  if (!decoded?.id) {
    throw new Error('Invalid token');
  }

  const user = await User.findById(decoded.id).select('_id tenantId roles name email');
  if (!user) {
    throw new Error('User not found');
  }

  const tenantId = decoded.tenantId ?? (user.tenantId ? String(user.tenantId) : undefined);
  if (!tenantId) {
    throw new Error('Tenant not found');
  }

  socket.data.userId = String(user._id);
  socket.data.tenantId = tenantId;
  socket.data.roles = Array.isArray(user.roles) ? user.roles.map((role) => String(role)) : [];
  socket.data.name = user.name;
}

export function initChatSocket(io: Server): void {
  io.use(async (socket, next) => {
    try {
      await authorizeSocket(socket);
      next();
    } catch (err) {
      next(err instanceof Error ? err : new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string | undefined;
    const tenantId = socket.data.tenantId as string | undefined;

    if (!userId || !tenantId) {
      socket.disconnect(true);
      return;
    }

    socket.join(`tenant:${tenantId}:presence`);

    socket.on('chat:join', async ({ channelId }: { channelId: string }) => {
      if (!channelId) return;

      const channel = await Channel.findOne({
        _id: channelId,
        tenantId: new Types.ObjectId(tenantId),
        isArchived: false,
        $or: [{ visibility: 'public' }, { members: new Types.ObjectId(userId) }],
      }).select('_id');

      if (!channel) {
        socket.emit('chat:error', { message: 'Channel not accessible' });
        return;
      }

      const room = buildChannelRoomId(tenantId, channelId);
      socket.join(room);
      const set = getPresenceSet(room);
      set.add(userId);
      io.to(room).emit('presence:online', { channelId, userId });
    });

    socket.on('chat:leave', ({ channelId }: { channelId: string }) => {
      if (!channelId) return;
      const room = buildChannelRoomId(tenantId, channelId);
      socket.leave(room);
      const set = getPresenceSet(room);
      if (set.delete(userId)) {
        io.to(room).emit('presence:offline', { channelId, userId });
      }
    });

    socket.on('chat:typing', ({ channelId, threadRoot }: { channelId: string; threadRoot?: string }) => {
      if (!channelId) return;
      const room = buildChannelRoomId(tenantId, channelId);
      socket.to(room).emit('chat:typing', { channelId, userId, threadRoot });
    });

    socket.on('presence:ping', ({ channelId }: { channelId: string }) => {
      if (!channelId) return;
      const room = buildChannelRoomId(tenantId, channelId);
      const set = getPresenceSet(room);
      socket.emit('presence:state', { channelId, users: Array.from(set) });
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (!room.startsWith('tenant:')) continue;
        const set = presenceByRoom.get(room);
        if (set?.delete(userId)) {
          const channelId = room.split(':').pop() ?? '';
          io.to(room).emit('presence:offline', { channelId, userId });
        }
      }
    });
  });
}
