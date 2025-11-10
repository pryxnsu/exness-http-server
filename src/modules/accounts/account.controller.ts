import { Context } from 'hono';
import { position, User } from '../../lib/db/schema';
import { calculateRequiredMargin, decodeOrderType, getInstrumentConfig } from './account.service';
import { getWalletByWalletId, updateWallet } from '../../lib/db/queries/wallet.queries';
import { HTTPException } from 'hono/http-exception';
import { HTTP_RESPONSE_CODE } from '../../constant';
import { getCurrentMarketPrice } from '../../services/redis/utils';
import { db } from '../../lib/db';
import { createOrder, getOrderByPositionId, updateOrder } from '../../lib/db/queries/order.queries';
import { createPosition, getPosition, updatePosition } from '../../lib/db/queries/position.queries';
import { createDeal } from '../../lib/db/queries/deal.queries';
import {
    publishAccountEvent,
    publishDealsEvent,
    publishOrderEvent,
    publishPositionEvent,
} from './account.events';

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

    const w = await getWalletByWalletId({ walletId, userId: user.id });

    // decode side and orderkind
    const { side, orderKind } = decodeOrderType(type);

    // not available for now
    if (orderKind !== 'market') {
        throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, {
            message: 'Pending orders not supported yet',
        });
    }

    // current price of instrument
    let tick = await getCurrentMarketPrice(instrument);

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
        const lockedWallet = await getWalletByWalletId({
            walletId,
            userId: user.id,
            isLock: true,
            trx,
        });

        const currentUsed = Number(lockedWallet.margin ?? 0);
        const currentFree = Number(lockedWallet.freeMargin ?? lockedWallet.balance);

        if (currentFree < requiredMargin) {
            throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, {
                message: 'Insufficient balance to make this order',
            });
        }

        const o = await createOrder(
            {
                userId: user.id,
                instrument,
                oneClick,
                side,
                requestedPrice: price,
                volume,
                orderKind,
                status: 'pending',
            },
            trx
        );

        const p = await createPosition(
            {
                userId: user.id,
                instrument,
                side,
                requiredMargin,
                volume,
                openPrice: executedPrice,
                sl,
                tp,
                status: 'open',
            },
            trx
        );

        const d = await createDeal(
            {
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
                reason: 2,
            },
            trx
        );

        await updateOrder(
            o.id,
            user.id,
            {
                status: 'filled',
                executedPrice,
                executedAt: new Date(),
                positionId: p.id,
            },
            trx
        );

        const newUsed = currentUsed + requiredMargin;
        const newFree = currentFree - requiredMargin;

        const updatedwallet = await updateWallet(
            lockedWallet.id,
            user.id,
            {
                margin: newUsed,
                freeMargin: newFree,
            },
            trx
        );

        return { o, p, updatedwallet, d };
    });

    // --------------- Publish events -------------
    publishOrderEvent('new', o, type, sl, tp, 0);
    publishOrderEvent('del', o, type, sl, tp, p.id);
    publishPositionEvent('open', {
        dealId: d.id,
        positionId: p.id,
        type,
        price,
        openPrice: p.openPrice,
        volume: p.volume,
        instrument: p.instrument,
        sl: p.sl,
        tp: p.tp,
        commission: d.commission,
        fee: d.fee,
        swap: d.swap,
        openTime: p.openedAt.getTime(),
        closeTime: null,
        profit: null,
        marginRate: p.openPrice,
        reason: d.reason,
    });

    publishDealsEvent('in', d);
    publishAccountEvent('upd', updatedwallet);

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
