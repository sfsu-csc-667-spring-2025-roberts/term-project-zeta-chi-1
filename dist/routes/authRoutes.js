"use strict";
// src/routes/authRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// POST /api/auth/register, /register path
router.post('/register', (0, validation_1.registerValidationRules)(), authController_1.registerUser);
// POST /api/auth/login, /login path
router.post('/login', (0, validation_1.loginValidationRules)(), authController_1.loginUser);
// POST /api/auth/logout, /logout path
router.post('/logout', authController_1.logoutUser);
// GET /api/auth/me, /me path
router.get('/me', authController_1.isAuthenticated, authController_1.getCurrentUser);
exports.default = router;
