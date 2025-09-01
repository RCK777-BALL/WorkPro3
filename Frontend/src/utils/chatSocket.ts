import { io, type Socket } from 'socket.io-client';
import { useSocketStore } from '../store/socketStore';
import { endpoints } from './env';

let socket: Socket | null = null;

export function getChatSocket(): Socket {
  if (socket) return socket;

  socket = io(endpoints.socketOrigin, {
    path: endpoints.socketPath,
    transports: ['websocket'],
    autoConnect: true,
  });

  const { setConnected } = useSocketStore.getState();
  socket.on('connect', () => setConnected(true));
  socket.on('disconnect', () => setConnected(false));
  socket.on('connect_error', () => setConnected(false));

  return socket;
}

