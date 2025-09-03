import { Server as SocketIOServer } from 'socket.io';
let io;
export function initSocket(server, allowedOrigins) {
    io = new SocketIOServer(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    });
    return io;
}
export function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}
