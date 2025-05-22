import { Server, Socket } from 'socket.io';

function getTimestamp(): string {
    return new Date().toLocaleString('en-US', { hour12: true });
}

export default function registerChatHandlers(io: Server, socket: Socket) {
    // Join game room
    socket.on('joinRoom', ({ room, username }) => {
        socket.join(room);
        io.to(room).emit('chatMessage', { message: `${username} joined the game.` });
        console.log(`[${getTimestamp()}] ${username} joined room: ${room}`);
    });

    // Chat message inside game room
    socket.on('chatMessage', ({ room, username, message }) => {
        const formattedMessage = `${username}: ${message}`;
        io.to(room).emit('chatMessage', { username, message });
        console.log(`[${getTimestamp()}] ${formattedMessage} in ${room}`);
    });

    // Disconnect cleanup
    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms].filter(r => r !== socket.id);
        rooms.forEach(room => {
            socket.to(room).emit('chatMessage', { message: `A player has left the game.` });
            console.log(`[${getTimestamp()}] A player disconnected from room: ${room}`);
        });
    });

    // Join lobby
    socket.on('joinLobby', ({ username }) => {
        socket.join('lobby');
        console.log(`[${getTimestamp()}] ${username} joined the lobby`);
    });

    // Lobby chat message
    socket.on('lobbyMessage', ({ username, message }) => {
        console.log(`[${getTimestamp()}] Broadcasting message in lobby: ${username}: ${message}`);
        io.to('lobby').emit('lobbyMessage', { username, message });
    });
}



