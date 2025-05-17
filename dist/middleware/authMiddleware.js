"use strict";
// src/middleware/authMiddleware.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.forwardAuthenticated = exports.ensureAuthenticated = void 0;
// Protect auth required routes
const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    else { // Redirect to login
        res.redirect('/index?unauthorized=true');
    }
};
exports.ensureAuthenticated = ensureAuthenticated;
// Prevent logged-in users from accessing login/register pages
const forwardAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        res.redirect('/home');
    }
    else { // Not logged in
        next();
    }
};
exports.forwardAuthenticated = forwardAuthenticated;
