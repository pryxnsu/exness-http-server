import { HTTPException } from 'hono/http-exception';
import { HTTP_RESPONSE_CODE } from '../../constant';
import { publish } from '../../services/redis/publisher';
import { env } from '../../env';
import { Deal, Order, Position, Wallet } from '../../lib/db/schema';
import { PositionEventProp } from '../../types';

export function publishOrderEvent(
    t: 'new' | 'del',
    userId: string,
    order: Order,
    type: number,
    sl: number,
    tp: number,
    positionId: string | number
) {
    try {
        publish(env.orderExecutedChannel, {
            e: 'orders',
            t: t,
            d: {
                userId,
                orderId: order.id,
                type,
                price: order.requestedPrice,
                volume: order.volume,
                instrument: order.instrument,
                sl,
                tp,
                openTime: order.requestedAt.getTime(),
                marginRate: order.requestedPrice,
                positionId,
            },
        });
    } catch (err: unknown) {
        console.error('[Publish Error] occurred while publish order event', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Failed to publish order event',
        });
    }
}

export function publishPositionEvent(t: 'open' | 'close' | 'upd' | 'part_close', data: PositionEventProp) {
    try {
        publish(env.positionChannel, {
            e: 'positions',
            t: t,
            d: data,
        });
    } catch (err: unknown) {
        console.error('[Publish Error] occurred while publish position event', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Failed to publish position event',
        });
    }
}

export function publishDealsEvent(t: 'in' | 'out', userId: string, d: Deal) {
    try {
        const { id, time, ...rest } = d;
        publish(env.dealsChannel, {
            e: 'deals',
            t: t,
            d: {
                userId,
                dealId: id,
                time: time.getTime(),
                ...rest,
            },
        });
    } catch (err: unknown) {
        console.error('[Publish Error] occurred while publish deals event', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Failed to publish deals event',
        });
    }
}

export function publishAccountEvent(t: 'upd', userId: string, w: Wallet) {
    try {
        publish(env.accountChannel, {
            e: 'account',
            t: t,
            d: {
                balance: {
                    balance: w.balance,
                    credit: 0.0,
                },
                settings: {
                    currency: 'USD',
                    leverage: w.leverage,
                    positionMode: 0,
                },
                userId,
            },
        });
    } catch (err: unknown) {
        console.error('[Publish Error] occurred while publish account event', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Failed to publish account event',
        });
    }
}
