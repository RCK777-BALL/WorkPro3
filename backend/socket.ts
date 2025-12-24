/*
 * SPDX-License-Identifier: MIT
 */

import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

type SocketOrigin =
  | string[]
  | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);

let io: SocketIOServer;

export function initSocket(server: HttpServer, origin: SocketOrigin): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}
