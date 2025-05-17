import { Server, Socket } from 'socket.io';

// Utility to get a readable timestamp
function getTimestamp(): string {
    return new Date().toLocaleString('en-US', { hour12: true });
}

export default function registerChatHandlers(io: Server, socket: Socket) {
    socket.on('joinRoom', ({ room, username }) => {
        socket.join(room);
        socket.to(room).emit('chatMessage', `${username} joined the game.`);

        // Terminal log
        console.log(`[${getTimestamp()}] ${username} joined room: ${room}`);
    });

    socket.on('chatMessage', ({ room, username, message }) => {
        io.to(room).emit('chatMessage', `${username}: ${message}`);

        // Terminal log
        console.log(`[${getTimestamp()}] ${username} says in ${room}: ${message}`);
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms].filter(r => r !== socket.id);
        rooms.forEach(room => {
            socket.to(room).emit('chatMessage', `A player has left the game.`);
            // Terminal log
            console.log(`[${getTimestamp()}] A player disconnected from room: ${room}`);
        });
    });
}

