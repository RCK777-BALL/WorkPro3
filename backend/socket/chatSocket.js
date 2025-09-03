export function initChatSocket(io) {
    const getRoom = (channelId) => `room:${channelId}`;
    io.on('connection', (socket) => {
        // Join a chat channel
        socket.on('chat:join', ({ channelId, userId }) => {
            const room = getRoom(channelId);
            socket.join(room);
            if (userId) {
                socket.data.userId = userId;
            }
            io.to(room).emit('presence:online', { channelId, userId: userId ?? socket.data.userId ?? socket.id });
        });
        // Typing indicator
        socket.on('chat:typing', ({ channelId, ...payload }) => {
            const room = getRoom(channelId);
            socket.to(room).emit('chat:typing', payload);
        });
        // New message
        socket.on('chat:message', ({ channelId, ...message }) => {
            const room = getRoom(channelId);
            io.to(room).emit('chat:message', message);
        });
        // Reaction to a message
        socket.on('chat:reaction', ({ channelId, ...reaction }) => {
            const room = getRoom(channelId);
            io.to(room).emit('chat:reaction', reaction);
        });
        // Mark message as read
        socket.on('chat:read', ({ channelId, ...payload }) => {
            const room = getRoom(channelId);
            io.to(room).emit('chat:read', payload);
        });
        // Presence offline on disconnect
        socket.on('disconnecting', () => {
            const userId = socket.data.userId || socket.id;
            for (const room of socket.rooms) {
                if (room.startsWith('room:')) {
                    const channelId = room.split(':')[1];
                    io.to(room).emit('presence:offline', { channelId, userId });
                }
            }
        });
    });
}
