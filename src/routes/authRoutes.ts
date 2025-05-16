// src/routes/authRoutes.ts

import { Router } from 'express';
import { registerUser, loginUser, logoutUser, getCurrentUser, isAuthenticated } from '../controllers/authController';
import { registerValidationRules, loginValidationRules } from '../middleware/validation';

const router = Router();

// POST /api/auth/register, /register path
router.post('/register', registerValidationRules(), registerUser);
// POST /api/auth/login, /login path
router.post('/login', loginValidationRules(), loginUser)
// POST /api/auth/logout, /logout path
router.post('/logout', logoutUser);
// GET /api/auth/me, /me path
router.get('/me', isAuthenticated, getCurrentUser);

export default router;