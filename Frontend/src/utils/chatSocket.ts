import { io, type Socket } from 'socket.io-client';
import { useSocketStore } from '../store/socketStore';

let socket: Socket | null = null;

export function getChatSocket(): Socket {
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

