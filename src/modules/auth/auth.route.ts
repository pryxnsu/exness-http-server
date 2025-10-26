import { Hono } from 'hono';
import { googleLogin, googleCallback, logout } from './auth.controller';
import { auth } from '../../middlewares/auth.middleware';

export const authRouter = new Hono();

authRouter.get('/google', googleLogin);
authRouter.get('/callback/google', googleCallback);
authRouter.get('/logout', auth, logout);
