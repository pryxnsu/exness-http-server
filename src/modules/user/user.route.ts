import { Hono } from 'hono';
import { auth } from '../../middlewares/auth.middleware';
import { getUser } from './user.controller';

export const userRouter = new Hono();

userRouter.get('/', auth, getUser);
