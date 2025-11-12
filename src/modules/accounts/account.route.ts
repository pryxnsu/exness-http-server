import { Hono } from 'hono';
import { auth } from '../../middlewares/auth.middleware';
import { executeOrder, getOpenedPositions, getHistoryPositions } from './account.controller';
import { zValidator } from '@hono/zod-validator';
import { CreateOrderSchema } from './account.types';

export const accountRouter = new Hono();

// create order
accountRouter.post('/:walletId/orders', zValidator('json', CreateOrderSchema), auth, executeOrder);

accountRouter.get('/positions', auth, getOpenedPositions);

accountRouter.get('/history/positions', auth, getHistoryPositions);
