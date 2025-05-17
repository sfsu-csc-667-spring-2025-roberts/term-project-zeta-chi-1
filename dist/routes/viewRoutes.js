"use strict";
// src/routes/viewRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
const publicDir = path_1.default.join(__dirname, '..', '..', 'public');
const htmlDir = path_1.default.join(publicDir, 'html'); // html subdir path
// At root, redirect to login or home based on auth
router.get('/', (req, res) => {
    if (req.session.user) { // Logged in, redirect home
        res.redirect('/home');
    }
    else { // Not logged in, redirect to login
        res.redirect('/index');
    }
});
// Router routes setup
// Login
router.get('/index', authMiddleware_1.forwardAuthenticated, (req, res) => {
    res.sendFile(path_1.default.join(htmlDir, 'index.html'));
});
router.get('/html/index.html', authMiddleware_1.forwardAuthenticated, (req, res) => {
    res.redirect('/index'); // Redirect direct .html access
});
// Register
router.get('/register', authMiddleware_1.forwardAuthenticated, (req, res) => {
    res.sendFile(path_1.default.join(htmlDir, 'register.html'));
});
router.get('/html/register.html', authMiddleware_1.forwardAuthenticated, (req, res) => {
    res.redirect('/register'); // Redirect direct .html access
});
// Homepage
router.get('/home', authMiddleware_1.ensureAuthenticated, (req, res) => {
    res.sendFile(path_1.default.join(htmlDir, 'home.html'));
});
// Settings
router.get('/settings', authMiddleware_1.ensureAuthenticated, (req, res) => {
    res.sendFile(path_1.default.join(htmlDir, 'settings.html'));
});
router.get('/html/settings.html', authMiddleware_1.ensureAuthenticated, (req, res) => {
    res.redirect('/settings'); // Redirect direct .html access
});
// Game
router.get('/game', authMiddleware_1.ensureAuthenticated, (req, res) => {
    // Game ID is handled by client's JS reading query params from URL: /game?gameId=xyz
    res.sendFile(path_1.default.join(htmlDir, 'game.html'));
});
// NOTE: DO NOT ALLOW ACCESS TO GAME BY .HTML LINK
exports.default = router;
