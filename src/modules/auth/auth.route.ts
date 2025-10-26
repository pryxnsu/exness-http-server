import { Hono } from 'hono';
import { googleLogin, googleCallback } from './auth.controller';

export const authRouter = new Hono();

authRouter.get('/google', googleLogin);
authRouter.get('/callback/google', googleCallback);
