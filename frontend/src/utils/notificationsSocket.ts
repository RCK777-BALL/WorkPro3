/*
 * SPDX-License-Identifier: MIT
 */

import { io, type Socket } from 'socket.io-client';
import { useSocketStore } from '@/store/socketStore';
import { useRealtimeStatusStore } from '@/modules/realtime/status/store';
import { endpoints } from './env';
import { FALLBACK_TOKEN_KEY, TENANT_KEY, TOKEN_KEY } from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

let socket: Socket | null = null;
let poll: ReturnType<typeof setInterval> | null = null;

function resolveAuth() {
  const token =
    safeLocalStorage.getItem(TOKEN_KEY) ?? safeLocalStorage.getItem(FALLBACK_TOKEN_KEY) ?? undefined;
  const tenantId = safeLocalStorage.getItem(TENANT_KEY) ?? undefined;
  return { token, tenantId };
}

function createSocket(): Socket {
  const auth = resolveAuth();
  const s = io(endpoints.socketOrigin, {
    path: endpoints.socketPath,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    auth,
  });

  const { setConnected } = useSocketStore.getState();
  const realtimeStatus = useRealtimeStatusStore.getState();

  const handleDegraded = () => {
    setConnected(false);
    realtimeStatus.setPolling('Realtime stream unavailable; falling back to polling', 5_000);
  };

  s.on('connect', () => {
    setConnected(true);
    realtimeStatus.setStreaming();
  });
  s.on('disconnect', handleDegraded);
  s.on('connect_error', handleDegraded);
  s.onAny(() => realtimeStatus.markDelivery());

  return s;
}

export function getNotificationsSocket(): Socket {
  if (!socket) socket = createSocket();
  else {
    socket.auth = resolveAuth();
  }
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

