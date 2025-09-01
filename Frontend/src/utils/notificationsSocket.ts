import { io, type Socket } from 'socket.io-client';
import { useSocketStore } from '../store/socketStore';

let socket: Socket | null = null;
let poll: ReturnType<typeof setInterval> | null = null;

function createSocket(): Socket {
  const base = import.meta.env.VITE_WS_NOTIFICATIONS_URL ?? 'ws://localhost:5055';

  const s = io(base, {
    path: '/ws/notifications',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });

  const { setConnected } = useSocketStore.getState();

  s.on('connect', () => {
    console.log('[notifications] socket connected');
    setConnected(true);
  });

  s.on('disconnect', (reason) => {
    console.log('[notifications] socket disconnected:', reason);
    setConnected(false);
  });

  s.on('connect_error', (err) => {
    console.error('[notifications] connect_error:', err?.message ?? err);
    setConnected(false);
  });

  return s;
}

export function getNotificationsSocket(): Socket {
  if (!socket) socket = createSocket();
  return socket;
}

export function closeNotificationsSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.close();
    socket = null;
  }
}

/** Simple polling fallback used when the socket can't stay connected. */
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
