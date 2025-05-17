"use strict";
// src/sockets/socketHandler.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketIO = initializeSocketIO;
const socket_io_1 = require("socket.io");
const matchmaking_1 = require("./matchmaking");
function initializeSocketIO(httpServer, sessionMiddleware) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*", // Configure this for production but for localhost it's fine
            methods: ["GET", "POST"]
        }
    });
    // Wrap express middleware so it's accessible to SocketIO
    const wrap = (middleware) => (socket, next) => middleware(socket.request, {}, next);
    io.use(wrap(sessionMiddleware));
    // Auth middleware check for SocketIO connections
    io.use((socket, next) => {
        const session = socket.request.session;
        if (session && session.user) { // Runs if user has session
            next();
        }
        else { // User had no session, reject connection
            console.error(`Socket ${socket.id} connection rejected - No active session.`);
            next(new Error("Unauthorized"));
        }
    });
    // Setup event handlers (matchmaking, game actions, etc)
    (0, matchmaking_1.setupMatchmaking)(io); // Make sure this happens after session/auth middleware
    console.log('Loaded Matchmaking');
    return io;
}
