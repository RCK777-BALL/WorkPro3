/*
 * SPDX-License-Identifier: MIT
 */

import type { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import Channel from '../models/Channel';
import { authorizeSocketTenant } from '../src/auth/accessControl';

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

export function initChatSocket(io: Server): void {
  io.use(async (socket, next) => {
    try {
      const { userId, tenantId, roles, name } = await authorizeSocketTenant(socket);
      socket.data.userId = userId;
      socket.data.tenantId = tenantId;
      socket.data.roles = roles;
      socket.data.name = name;
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
