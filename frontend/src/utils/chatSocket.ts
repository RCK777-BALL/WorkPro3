/*
 * SPDX-License-Identifier: MIT
 */

import type { Socket } from 'socket.io-client';
import {
  getNotificationsSocket as baseGetSocket,
  closeNotificationsSocket as baseCloseSocket,
} from './notificationsSocket';
import { useSocketStore } from '../store/socketStore';

let wiredListeners = false;

/** Returns the shared Socket.IO client used for chat/notifications. */
export function getChatSocket(): Socket {
  const socket = baseGetSocket();

  // Wire store connectivity listeners once
  if (!wiredListeners) {
    const { setConnected } = useSocketStore.getState();
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    wiredListeners = true;
  }

  return socket;
}

/** Closes the socket and resets connectivity state. */
export function closeChatSocket(): void {
  const { setConnected } = useSocketStore.getState();
  setConnected(false);
  baseCloseSocket();
}

export default { getChatSocket, closeChatSocket };
