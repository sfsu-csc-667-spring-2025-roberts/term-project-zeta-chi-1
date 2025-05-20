import { Server, Socket } from 'socket.io';

function getTimestamp(): string {
    return new Date().toLocaleString('en-US', { hour12: true });
}

export default function registerChatHandlers(io: Server, socket: Socket) {
    socket.on('joinRoom', ({ room, username }) => {
        socket.join(room);
        io.to(room).emit('chatMessage', { message: `${username} joined the game.` }); // Removed `username: ''`
        console.log(`[${getTimestamp()}] ${username} joined room: ${room}`);
    });
    socket.on('chatMessage', ({ room, username, message }) => {
        const formattedMessage = `${username}: ${message}`;
        io.to(room).emit('chatMessage', { username, message });
        console.log(`[${getTimestamp()}] ${formattedMessage} in ${room}`);
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms].filter(r => r !== socket.id);
        rooms.forEach(room => {
            socket.to(room).emit('chatMessage', { message: `A player has left the game.` }); // Removed `username: ''`
            console.log(`[${getTimestamp()}] A player disconnected from room: ${room}`);
        });
    });
}



