"use strict";
// src/controllers/authController.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = exports.getCurrentUser = exports.logoutUser = exports.loginUser = exports.registerUser = void 0;
const express_validator_1 = require("express-validator");
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("../config/db"));
const SALT_ROUNDS = 10;
// Registration handler
const registerUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { email, password, firstName, lastName } = req.body;
    try {
        const userCheck = yield db_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            res.status(409).json({ message: 'Email already in use' });
            return;
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, SALT_ROUNDS);
        const newUserResult = yield db_1.default.query('INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name, wins, losses', [email, hashedPassword, firstName, lastName]);
        const newUser = newUserResult.rows[0];
        res.status(201).json({ message: 'User registered successfully', user: newUser });
    }
    catch (error) {
        next(error); // Pass error to error handler
    }
});
exports.registerUser = registerUser;
// Login Handler
const loginUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    const { email, password } = req.body;
    try {
        const userResult = yield db_1.default.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const user = userResult.rows[0];
        const isMatch = yield bcrypt_1.default.compare(password, user.password_hash);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }
        const userSessionData = {
            id: user.id,
            email: user.email,
            wins: user.wins,
            losses: user.losses,
            firstName: user.first_name,
            lastName: user.last_name,
        };
        if (req.session) {
            req.session.user = userSessionData;
        }
        if (!(req.session && req.session.user)) { // Check for both session and user
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }
        res.status(200).json({ user: req.session.user }); // This exists so access it here
    }
    catch (error) {
        next(error);
    }
});
exports.loginUser = loginUser;
// Logout handler
const logoutUser = (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Session destruction error:", err);
            res.clearCookie('connect.sid');
            res.status(500).json({ message: 'Could not log out, please try again.' });
            return;
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logout successful' });
    });
};
exports.logoutUser = logoutUser;
// Get current user for API endpoint
const getCurrentUser = (req, res) => {
    if (!req.session.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
    }
    res.status(200).json({ user: req.session.user });
};
exports.getCurrentUser = getCurrentUser;
// API auth check for middleware
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        res.status(401).json({ message: 'Access denied. No session available.' });
        return;
    }
    next(); // Called if authenticated
};
exports.isAuthenticated = isAuthenticated;
