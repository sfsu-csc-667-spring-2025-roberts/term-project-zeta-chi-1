// src/types/user.ts

export interface User {
    id: string;
    email: string;
    wins?: number; // Tracks current player W/L
    losses?: number;
    firstName: string;
    lastName: string;
    avatarData: Record<string, any>;
}

export interface UserWithPassword extends User {
    password_hash: string;
    wins: number;
    losses: number;
    first_name: string;
    last_name: string;
    avatar_data: any;
}

// User is not a known property to sessionData fix
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: User; // References User interface
  }
}