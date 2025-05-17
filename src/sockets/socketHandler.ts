// src/sockets/socketHandler.ts

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import session from 'express-session';
import { RequestHandler } from 'express';
import { setupMatchmaking } from './matchmaking';
import registerChatHandlers from './chat';


export function initializeSocketIO(httpServer: HttpServer, sessionMiddleware: RequestHandler) {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    const wrap = (middleware: RequestHandler) => (socket: Socket, next: (err?: Error) => void) =>
        middleware(socket.request as any, {} as any, next as any);

    io.use(wrap(sessionMiddleware));

    io.use((socket, next) => {
        const session = (socket.request as any).session;
        if (session && session.user) {
            next();
        } else {
            console.error(`Socket ${socket.id} connection rejected - No active session.`);
            next(new Error("Unauthorized"));
        }
    });

    // 🔥 Add this to handle chat events
    io.on('connection', (socket) => {
        registerChatHandlers(io, socket);
    });

    setupMatchmaking(io);

    console.log('Loaded Matchmaking');

    return io;
}
