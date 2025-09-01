import { io, type Socket } from 'socket.io-client';
import { useSocketStore } from '../store/socketStore';

let socket: Socket | null = null;

function createSocket(): Socket {
  const base = import.meta.env.VITE_WS_NOTIFICATIONS_URL ?? 'ws://localhost:5055';

  const s = io(base, {
    path: '/ws/notifications',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });

  const { setConnected } = useSocketStore.getState();

  s.on('connect', () => {
    console.log('notifications socket connected');
    setConnected(true);
  });

  s.on('disconnect', (reason) => {
    console.log('notifications socket disconnected', reason);
    setConnected(false);
  });

  s.on('connect_error', (err) => {
    console.error('notifications socket connect_error', err);
    setConnected(false);
  });

  return s;
}

export function getNotificationsSocket(): Socket {
  if (!socket) socket = createSocket();
  return socket;
}

export function closeNotificationsSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

