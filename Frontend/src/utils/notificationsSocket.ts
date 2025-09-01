import { io, type Socket } from 'socket.io-client';
import { useSocketStore } from '../store/socketStore';

let socket: Socket | null = null;
let poll: ReturnType<typeof setInterval> | null = null;

export function getNotificationsSocket(): Socket {
  if (socket) return socket;
  const base =
    import.meta.env.VITE_WS_NOTIFICATIONS_URL ?? 'ws://localhost:5055';
  socket = io(base, {
    path: '/ws/notifications',
    transports: ['websocket'],
    autoConnect: true,
  });
  const { setConnected } = useSocketStore.getState();
  socket.on('connect', () => setConnected(true));
  socket.on('disconnect', () => setConnected(false));
  socket.on('connect_error', () => setConnected(false));
  return socket;
}

export function closeNotificationsSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

export function startNotificationsPoll(fn: () => void, interval = 10_000) {
  if (poll) return;
  poll = setInterval(fn, interval);
}

export function stopNotificationsPoll() {
  if (poll) {
    clearInterval(poll);
    poll = null;
  }
}
