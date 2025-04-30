// src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';

// Protect auth required routes
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.user) {
    return next();
  } else { // Redirect to login
    res.redirect('/index?unauthorized=true');
  }
};

// Prevent logged-in users from accessing login/register pages
export const forwardAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.session && req.session.user) {
        res.redirect('/home');
    } else { // Not logged in
        next();
    }
}