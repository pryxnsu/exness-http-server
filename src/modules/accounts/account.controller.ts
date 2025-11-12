import { Context } from 'hono';
import { User } from '../../lib/db/schema';
import {
    calculatePnl,
    calculateRequiredMargin,
    decodeOrderType,
    getInstrumentConfig,
} from './account.service';
import { getWalletByWalletId, updateWallet } from '../../lib/db/queries/wallet.queries';
import { HTTPException } from 'hono/http-exception';
import { HTTP_RESPONSE_CODE } from '../../constant';
import { getAllMarketPrices, getCurrentMarketPrice } from '../../services/redis/utils';
import { db } from '../../lib/db';
import { createOrder, updateOrder } from '../../lib/db/queries/order.queries';
import {
    createPosition,
    getPositionsByUserId,
} from '../../lib/db/queries/position.queries';
import { createDeal, getDealByPosition } from '../../lib/db/queries/deal.queries';
import {
    publishAccountEvent,
    publishDealsEvent,
    publishOrderEvent,
    publishPositionEvent,
} from './account.events';
import { getInstrumentPriceKey } from '../../services/redis/keys';

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
                direction: 0,
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

export const getOpenedPositions = async (c: Context) => {
    const user = c.get('user') as User;

    const positions = await getPositionsByUserId(user.id, { active: true });

    const key = getInstrumentPriceKey();
    const ticks = await getAllMarketPrices(key);

    if (!ticks) {
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Failed to fetch market data',
        });
    }

    const result = positions.map(p => {
        const sym = p.instrument.replace('/', '');
        const tick = ticks.get(sym);
        if (!tick || !tick.ask || !tick.bid) {
            console.warn(`[Warning] Missing tick data for ${sym}`);
            throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
                message: `Missing tick data for ${sym}`,
            });
        }
        const currPrice = p.side === 'buy' ? tick.ask : tick.bid;
        const pnl = calculatePnl(p.instrument, p.side, p.openPrice, currPrice, p.volume);

        return {
            symbol: p.instrument,
            type: p.side,
            volume: p.volume,
            openPrice: p.openPrice,
            currentPrice: currPrice,
            tp: p.tp,
            sl: p.sl,
            position: p.id,
            openTime: p.openedAt,
            swap: null,
            pnl,
        };
    });

    return c.json({
        success: true,
        message: 'Active positions fetched successfuly',
        positions: result.length ? result : [],
    });
};

export const getHistoryPositions = async (c: Context) => {
    const user = c.get('user') as User;
    let { fromDate, toDate } = c.req.query();

    if (!fromDate) {
        throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, {
            message: 'Invalid from date query provided',
        });
    }

    const from = new Date(Number(fromDate));
    const to = toDate ? new Date(Number(toDate)) : new Date();

    const result = await getDealByPosition(from, to, user.id);

    return c.json({
        success: true,
        message: 'Positions history fetched successfuly',
        positions: result.length ? result : [],
    });
};
