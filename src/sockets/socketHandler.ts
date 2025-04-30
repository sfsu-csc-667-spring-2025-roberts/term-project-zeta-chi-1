// src/sockets/socketHandler.ts

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import session from 'express-session';
import { RequestHandler } from 'express';
import { setupMatchmaking } from './matchmaking';

export function initializeSocketIO(httpServer: HttpServer, sessionMiddleware: RequestHandler) {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: "*", // Configure this for production but for localhost it's fine
            methods: ["GET", "POST"]
        }
    });

    // Wrap express middleware so it's accessible to SocketIO
    const wrap = (middleware: RequestHandler) => (socket: Socket, next: (err?: Error) => void) =>
        middleware(socket.request as any, {} as any, next as any);

    io.use(wrap(sessionMiddleware));

    // Auth middleware check for SocketIO connections
    io.use((socket, next) => {
        const session = (socket.request as any).session;
        if (session && session.user) { // Runs if user has session
            next();
        } else { // User had no session, reject connection
            console.error(`Socket ${socket.id} connection rejected - No active session.`);
            next(new Error("Unauthorized"));
        }
    });
                            // Setup event handlers (matchmaking, game actions, etc)
    setupMatchmaking(io);   // Make sure this happens after session/auth middleware

    console.log('Loaded Matchmaking');

    return io;
}