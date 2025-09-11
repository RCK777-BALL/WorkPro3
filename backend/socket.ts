/*
 * SPDX-License-Identifier: MIT
 */

import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export function initSocket(server: HttpServer, allowedOrigins: string[]): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
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
