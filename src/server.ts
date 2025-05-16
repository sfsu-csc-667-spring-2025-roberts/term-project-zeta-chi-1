// src/server.ts

import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import path from 'path';
import dotenv from 'dotenv';
import favicon from 'serve-favicon';
import http from 'http';
import authApiRoutes from './routes/authRoutes';
import viewRoutes from './routes/viewRoutes';
import { errorHandler } from './middleware/errorHandler';
import { initializeSocketIO } from './sockets/socketHandler';

dotenv.config();

const app = express();

app.use(favicon(path.join(process.cwd(), 'public', 'favicon.ico'))); // HTML favicon setup

const httpServer = http.createServer(app); // Create HTTP server from Express app
const port = process.env.PORT || 3000;

const sessionMiddleware = session({
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware); // Uses session middleware in Express Routes
console.log('Loaded Middleware');

// Static files serving public dir
app.use(express.static(path.join(__dirname, '..', 'public')));
console.log('Loaded Static Files');

// Routes
app.use('/', viewRoutes);
app.use('/api/auth', authApiRoutes);
console.log('Loaded Routes');

// SocketIO
// Pass the httpServer and the same sessionMiddleware instance
const io = initializeSocketIO(httpServer, sessionMiddleware);
console.log('Loaded SocketIO');

// Not found & errors handler
app.use('/api/{*any}', (req: Request, res: Response) => {
     res.status(404).json({ message: 'API endpoint not found' });
 });
app.use((req: Request, res: Response, next: NextFunction) => { // 404 page
    if (req.accepts('html')) {
        res.status(404).sendFile(path.join(__dirname, '..', 'public', 'html', '404.html'));
    } else {
        res.status(404).json({ message: 'Resource not found' });
    }
});
app.use(errorHandler);
console.log('Loaded Error Handler');

// Start server using httpServer.listen
httpServer.listen(port, () => {
    console.log(`\nLoaded server on port ${port}\n`);
});