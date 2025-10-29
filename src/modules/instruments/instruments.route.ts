import { Hono } from 'hono';
import {
    addInstrument,
    favoriteInstrument,
    favoriteInstrumentsPrices,
    priceHistory,
    removeInstrumentFromFavorite,
} from './instruments.controller';
import { auth } from '../../middlewares/auth.middleware';
import { zValidator } from '@hono/zod-validator';
import { AddFavoriteInstrumentSchema } from './instruments.types';

export const instrumentsRouter = new Hono();

// add new instrument to favorites
instrumentsRouter.post('/', auth, zValidator('json', AddFavoriteInstrumentSchema), addInstrument);
// all favorites instruments
instrumentsRouter.get('/', auth, favoriteInstrument);
// favorites instruments
instrumentsRouter.get('/favorites', auth, favoriteInstrumentsPrices);
// fetch candles of instrument
instrumentsRouter.get('/:symbol/:type/candles', auth, priceHistory);
// remove instrument from favorite
instrumentsRouter.delete('/:id', auth, removeInstrumentFromFavorite);
