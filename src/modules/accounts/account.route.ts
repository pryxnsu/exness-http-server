import { Hono } from 'hono';
import { auth } from '../../middlewares/auth.middleware';
import {
    // closePosition,
    executeOrder,
    getOpenedPositions,
    getHistoryPositions,
    closePosition,
} from './account.controller';
import { zValidator } from '@hono/zod-validator';
import { ClosePositionSchema, CreateOrderSchema } from './account.types';

export const accountRouter = new Hono();

// create order
accountRouter.post('/:walletId/orders', zValidator('json', CreateOrderSchema), auth, executeOrder);

// close position
accountRouter.put(
    '/:walletId/position/:positionId/close',
    zValidator('json', ClosePositionSchema),
    auth,
    closePosition
);

accountRouter.get('/positions', auth, getOpenedPositions);

accountRouter.get('/history/positions', auth, getHistoryPositions);
