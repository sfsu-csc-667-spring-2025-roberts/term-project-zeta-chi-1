// src/types/user.ts

export interface User {
    id: string;
    email: string;
    wins?: number; // Tracks current player W/L
    losses?: number;
}

export interface UserWithPassword extends User {
    password_hash: string;
    wins: number;
    losses: number;
}

// User is not a known property to sessionData fix
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: User; // References User interface
  }
}