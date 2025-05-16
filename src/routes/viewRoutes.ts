// src/routes/viewRoutes.ts

import { Router } from 'express';
import path from 'path';
import { ensureAuthenticated, forwardAuthenticated } from '../middleware/authMiddleware';

const router = Router();
const publicDir = path.join(__dirname, '..', '..', 'public');
const htmlDir = path.join(publicDir, 'html'); // html subdir path

// At root, redirect to login or home based on auth
router.get('/', (req, res) => {
    if (req.session.user) { // Logged in, redirect home
        res.redirect('/home');
    } else { // Not logged in, redirect to login
        res.redirect('/index'); 
    }
});

// Router routes setup
// Login
router.get('/index', forwardAuthenticated, (req, res) => {
     res.sendFile(path.join(htmlDir, 'index.html'));
});
router.get('/html/index.html', forwardAuthenticated, (req, res) => { 
    res.redirect('/index'); // Redirect direct .html access
});

// Register
router.get('/register', forwardAuthenticated, (req, res) => {
     res.sendFile(path.join(htmlDir, 'register.html'));
});
router.get('/html/register.html', forwardAuthenticated, (req, res) => {
    res.redirect('/register'); // Redirect direct .html access
});

// Homepage
router.get('/home', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(htmlDir, 'home.html'));
});

// Settings
router.get('/settings', ensureAuthenticated, (req, res) => {
    res.sendFile(path.join(htmlDir, 'settings.html'));
});
router.get('/html/settings.html', ensureAuthenticated, (req, res) => {
    res.redirect('/settings'); // Redirect direct .html access
});

// Game
router.get('/game', ensureAuthenticated, (req, res) => {
     // Game ID is handled by client's JS reading query params from URL: /game?gameId=xyz
    res.sendFile(path.join(htmlDir, 'game.html'));
});
// NOTE: DO NOT ALLOW ACCESS TO GAME BY .HTML LINK

export default router;