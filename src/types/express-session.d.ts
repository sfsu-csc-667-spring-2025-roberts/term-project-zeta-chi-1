import 'express-session';
import { User } from '../types/user';

declare module 'express-session' {
  interface SessionData {
    user?: User;
  }
}
