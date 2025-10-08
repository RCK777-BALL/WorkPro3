/*
 * SPDX-License-Identifier: MIT
 */

import { io, type Socket } from 'socket.io-client';
import { useSocketStore } from '@/store/socketStore';
import { endpoints } from './env';

let socket: Socket | null = null;
let poll: ReturnType<typeof setInterval> | null = null;

function createSocket(): Socket {
  const s = io(endpoints.socketOrigin, {
    path: endpoints.socketPath,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });

  const { setConnected } = useSocketStore.getState();

  s.on('connect', () => setConnected(true));
  s.on('disconnect', () => setConnected(false));
  s.on('connect_error', () => setConnected(false));

  return s;
}

export function getNotificationsSocket(): Socket {
  if (!socket) socket = createSocket();
  return socket;
}

export function closeNotificationsSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function startNotificationsPoll(fn: () => void, interval = 10_000): void {
  if (poll) return;
  poll = setInterval(fn, interval);
}

export function stopNotificationsPoll(): void {
  if (poll) {
    clearInterval(poll);
    poll = null;
  }
}

