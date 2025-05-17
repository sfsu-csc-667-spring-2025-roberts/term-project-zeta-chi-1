"use strict";
// src/sockets/socketHandler.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocketIO = initializeSocketIO;
const socket_io_1 = require("socket.io");
const matchmaking_1 = require("./matchmaking");
const chat_1 = __importDefault(require("./chat"));
function initializeSocketIO(httpServer, sessionMiddleware) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });
    const wrap = (middleware) => (socket, next) => middleware(socket.request, {}, next);
    io.use(wrap(sessionMiddleware));
    io.use((socket, next) => {
        const session = socket.request.session;
        if (session && session.user) {
            next();
        }
        else {
            console.error(`Socket ${socket.id} connection rejected - No active session.`);
            next(new Error("Unauthorized"));
        }
    });
    // 🔥 Add this to handle chat events
    io.on('connection', (socket) => {
        (0, chat_1.default)(io, socket);
    });
    (0, matchmaking_1.setupMatchmaking)(io);
    console.log('Loaded Matchmaking');
    return io;
}
