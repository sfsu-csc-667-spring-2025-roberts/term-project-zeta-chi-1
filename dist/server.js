"use strict";
// src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const serve_favicon_1 = __importDefault(require("serve-favicon"));
const http_1 = __importDefault(require("http"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const viewRoutes_1 = __importDefault(require("./routes/viewRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const socketHandler_1 = require("./sockets/socketHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, serve_favicon_1.default)(path_1.default.join(process.cwd(), 'public', 'favicon.ico'))); // HTML favicon setup
const httpServer = http_1.default.createServer(app); // Create HTTP server from Express app
const port = process.env.PORT || 3000;
const sessionMiddleware = (0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'fallback-secret-string',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 80000000, // 1 day is 80,000,000 ms
    },
    name: 'connect.sid',
});
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(sessionMiddleware); // Uses session middleware in Express Routes
console.log('Loaded Middleware');
// Static files serving public dir
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
console.log('Loaded Static Files');
// Routes
app.use('/', viewRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
console.log('Loaded Routes');
// SocketIO
// Pass the httpServer and the same sessionMiddleware instance
const io = (0, socketHandler_1.initializeSocketIO)(httpServer, sessionMiddleware);
console.log('Loaded SocketIO');
// Not found & errors handler
app.use('/api/{*any}', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});
app.use((req, res, next) => {
    if (req.accepts('html')) {
        res.status(404).sendFile(path_1.default.join(__dirname, '..', 'public', 'html', '404.html'));
    }
    else {
        res.status(404).json({ message: 'Resource not found' });
    }
});
app.use(errorHandler_1.errorHandler);
console.log('Loaded Error Handler');
// Start server using httpServer.listen
httpServer.listen(port, () => {
    console.log(`\nLoaded server on port ${port}\n`);
});
