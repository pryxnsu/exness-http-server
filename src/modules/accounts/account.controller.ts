import { Context } from 'hono';
import { deal, order, position, User, wallet } from '../../lib/db/schema';
import { calculateRequiredMargin, decodeOrderType, getInstrumentConfig } from './account.service';
import { getWalletByWalletId } from '../../lib/db/queries/wallet.queries';
import { HTTPException } from 'hono/http-exception';
import { HTTP_RESPONSE_CODE } from '../../constant';
import { getCurrentMarketPrice } from '../../services/redis/utils';
import { db } from '../../lib/db';
import { and, eq } from 'drizzle-orm';
import { env } from '../../env';
import { publish } from '../../services/redis/publisher';

export const executeOrder = async (c: Context) => {
    const user = c.get('user') as User;
    const walletId = c.req.param('walletId');
    // @ts-ignore
    const body = c.req.valid('json');

    const { instrument, oneClick, price, sl, tp, type, volume } = body as {
        instrument: string;
        oneClick: boolean;
        price: number;
        sl: number;
        tp: number;
        type: number;
        volume: number;
    };

    // user wallet
    const w = await getWalletByWalletId(walletId, user.id);

    if (!w) {
        throw new HTTPException(HTTP_RESPONSE_CODE.NOT_FOUND, {
            message: 'Wallet not found. Please make one',
        });
    }

    // decode side and orderkind
    const { side, orderKind } = decodeOrderType(type);

    // not available for now
    if (orderKind !== 'market') {
        throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, {
            message: 'Pending orders not supported yet',
        });
    }

    // current price of instrument
    const tick = (await getCurrentMarketPrice(instrument));

    if (!tick || Number.isNaN(tick.ask) || Number.isNaN(tick.bid)) {
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Market price unavailable',
        });
    }

    const executedPrice = side === 'buy' ? tick.ask : tick.bid;

    const { contractSize, marginFactor } = getInstrumentConfig(instrument);

    if (!contractSize || !marginFactor) {
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Contract size and margin factor not available',
        });
    }

    const requiredMargin = calculateRequiredMargin({
        volumeLots: Number(volume),
        price: Number(executedPrice),
        leverage: Number(w.leverage),
        contractSize,
        marginFactor,
    });

    if (requiredMargin <= 0) {
        throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, {
            message: 'Invalid margin calculation',
        });
    }

    // --------------- DB Transactions ---------------
    const { o, p, updatedwallet, d } = await db.transaction(async trx => {
        const [lockedWallet] = await trx
            .select()
            .from(wallet)
            .where(and(eq(wallet.id, w.id), eq(wallet.userId, user.id)))
            .for('update');

        if (!lockedWallet) {
            throw new HTTPException(HTTP_RESPONSE_CODE.NOT_FOUND, {
                message: 'Wallet not found',
            });
        }

        const currentUsed = Number(lockedWallet.margin ?? 0);
        const currentFree = Number(lockedWallet.freeMargin ?? lockedWallet.balance);

        if (currentFree < requiredMargin) {
            throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, {
                message: 'Insufficient balance to make this order',
            });
        }

        const [o] = await trx
            .insert(order)
            .values({
                userId: user.id,
                instrument,
                oneClick,
                side,
                requestedPrice: price,
                volume,
                orderKind,
                status: 'pending',
            })
            .returning();

        const [p] = await trx
            .insert(position)
            .values({
                userId: user.id,
                instrument,
                side,
                volume,
                openPrice: executedPrice,
                sl,
                tp,
                status: 'open',
            })
            .returning();

        const [d] = await trx
            .insert(deal)
            .values({
                orderId: o.id,
                positionId: p.id,
                type,
                direction: side === 'buy' ? 0 : 1,
                price: executedPrice,
                time: p.openedAt,
                volume,
                volumeClosed: 0.0,
                instrument,
                profit: 0,
                sl,
                tp,
                reason: 2
            })
            .returning();

        await trx
            .update(order)
            .set({
                status: 'filled',
                executedPrice,
                executedAt: new Date(),
                positionId: p.id,
            })
            .where(eq(order.id, o.id));

        const newUsed = currentUsed + requiredMargin;
        const newFree = currentFree - requiredMargin;
        const [updatedwallet] = await trx
            .update(wallet)
            .set({
                margin: newUsed,
                freeMargin: newFree,
            })
            .where(eq(wallet.id, lockedWallet.id))
            .returning();

        return { o, p, updatedwallet, d };
    });

    // --------------- Publish events -------------
    const openTimeMs = o.requestedAt.getTime();

    publish(env.orderExecutedChannel, {
        e: 'orders',
        t: 'new',
        d: {
            orderId: o.id,
            type,
            price,
            volume,
            instrument,
            sl,
            tp,
            openTime: openTimeMs,
            marginRate: executedPrice,
            positionId: 0,
        },
    });

    publish(env.orderExecutedChannel, {
        e: 'orders',
        t: 'del',
        d: {
            orderId: o.id,
            type,
            price,
            volume,
            instrument,
            sl,
            tp,
            marginRate: executedPrice,
            openTime: openTimeMs,
            positionId: p.id,
        },
    });

    publish(env.positionChannel, {
        e: 'positions',
        t: 'open',
        d: {
            positionId: p.id,
            orderId: o.id,
            type,
            price,
            openPrice: p.openPrice,
            volume,
            instrument,
            sl,
            tp,
            openTime: p.openedAt.getTime(),
            closeTime: null,
            profit: 0,
            marginRate: executedPrice,
        },
    });

    // Publish deals event
    const { id, time, ...rest } = d;
    publish(env.dealsChannel, {
        e: 'deals',
        t: 'in',
        d: {
            dealId: id,
            time: time.getTime(),
            ...rest,
        },
    });

    publish(env.accountChannel, {
        e: 'wallet',
        t: 'upd',
        d: {
            balance: {
                balance: updatedwallet.balance,
                credit: 0.0,
            },
            settings: {
                currency: 'USD',
                leverage: updatedwallet.leverage,
                positionMode: 0,
            },
        },
    });

    return c.json({
        success: true,
        message: 'Order executed succesfully',
        order: {
            time: p.openedAt.getTime(),
            price: executedPrice,
            orderId: o.id,
            positionId: p.id,
        },
    });
};