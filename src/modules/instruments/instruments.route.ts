import { Hono } from 'hono';
import {
    addInstrument,
    favoriteInstrument,
    removeInstrumentFromFavorite,
} from './instruments.controller';
import { auth } from '../../middlewares/auth.middleware';
import { zValidator } from '@hono/zod-validator';
import { AddFavoriteInstrumentSchema } from './instruments.types';

export const instrumentsRouter = new Hono();

instrumentsRouter.post('/', auth, zValidator('json', AddFavoriteInstrumentSchema), addInstrument);
instrumentsRouter.get('/', auth, favoriteInstrument);
instrumentsRouter.delete('/:id', auth, removeInstrumentFromFavorite);
