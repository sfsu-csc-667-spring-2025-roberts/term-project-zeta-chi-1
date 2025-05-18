// src/controllers/authController.ts

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import pool from '../config/db';
import { User, UserWithPassword } from '../types/user';

const SALT_ROUNDS = 10;

// Registration handler
export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password, firstName, lastName, avatar } = req.body;

  try {
    const userCheck = await pool.query<UserWithPassword>('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      res.status(409).json({ message: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUserResult = await pool.query<User>(
        'INSERT INTO users (email, password_hash, first_name, last_name, avatar_data) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, wins, losses, avatar_data',
      [email, hashedPassword, firstName, lastName, avatar]
    );
    const newUser = newUserResult.rows[0];

    res.status(201).json({ message: 'User registered successfully', user: newUser });

  } catch (error) {
    next(error); // Pass error to error handler
  }
};


// Login Handler
export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    try {
        const userResult = await pool.query<UserWithPassword>('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        const userSessionData: User = {
            id: user.id,
            email: user.email,
            wins: user.wins,
            losses: user.losses,
            firstName: user.first_name,
            lastName: user.last_name,
            avatarData: user.avatar_data,
        };

        if (req.session) {
            req.session.user = userSessionData;
        }
        
        if (!(req.session && req.session.user)) { // Check for both session and user
            res.status(401).json({ message: 'Not authenticated' });
        return;
        }
        
        res.status(200).json({ user: req.session.user }); // This exists so access it here

    } catch (error) {
        next(error);
    }
};

// Logout handler
export const logoutUser = (req: Request, res: Response, next: NextFunction): void => {
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

// Get current user for API endpoint
export const getCurrentUser = (req: Request, res: Response): void => {
    if (!req.session.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
    }
    res.status(200).json({ user: req.session.user });
};

// API auth check for middleware
export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.user) {
        res.status(401).json({ message: 'Access denied. No session available.' });
        return;
    }
    next(); // Called if authenticated
};