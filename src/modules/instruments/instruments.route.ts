import { Hono } from 'hono';
import {
    addInstrumentToFavorites,
    addNewInstrument,
    fetchFavoriteInstruments,
    favoriteInstrumentsPrices,
    priceHistory,
    removeInstrumentFromFavorite,
} from './instruments.controller';
import { auth } from '../../middlewares/auth.middleware';
import { zValidator } from '@hono/zod-validator';
import { AddFavoriteInstrumentSchema, AddNewInstrumentSchema } from './instruments.types';

export const instrumentsRouter = new Hono();

// add new instrument
instrumentsRouter.post('/', zValidator('json', AddNewInstrumentSchema), addNewInstrument);
// add new instrument to favorites
instrumentsRouter.post('/favorites', auth, zValidator('json', AddFavoriteInstrumentSchema), addInstrumentToFavorites);
// all favorites instruments
instrumentsRouter.get('/', auth, fetchFavoriteInstruments);
// favorites instruments
instrumentsRouter.get('/favorites', auth, favoriteInstrumentsPrices);
// fetch candles of instrument
instrumentsRouter.get('/:symbol/:type/candles', auth, priceHistory);
// remove instrument from favorite
instrumentsRouter.delete('/:id', auth, removeInstrumentFromFavorite);
