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
import { createOrder, getOrderByPositionId, updateOrder } from '../../lib/db/queries/order.queries';
import {
    createPosition,
    getPosition,
    getPositionsByUserId,
    updatePosition,
} from '../../lib/db/queries/position.queries';
import { createDeal, getDealByPosition } from '../../lib/db/queries/deal.queries';
import {
    publishAccountEvent,
    publishDealsEvent,
    publishOrderEvent,
    publishPositionEvent,
} from './account.events';
import { getInstrumentPriceKey } from '../../services/redis/keys';
import { symbolInDb } from '../../lib/db/queries/instrument.queries';

export const executeOrder = async (c: Context) => {
    const user = c.get('user') as User;
    const walletId = c.req.param('walletId');
    // @ts-ignore
    const body = c.req.valid('json');

    const {
        instrument: sym,
        oneClick,
        price,
        sl,
        tp,
        type,
        volume,
    } = body as {
        instrument: string;
        oneClick: boolean;
        price: number;
        sl: number;
        tp: number;
        type: number;
        volume: number;
    };

    const symbol = await symbolInDb(sym);

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
    let tick = await getCurrentMarketPrice(sym);

    const executedPrice = side === 'buy' ? tick.ask : tick.bid;

    const { contractSize, marginFactor } = getInstrumentConfig(sym);

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
                instrument: symbol,
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
                instrument: symbol,
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
                instrument: symbol,
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
    publishOrderEvent('new', user.id, o, type, sl, tp, 0);
    publishOrderEvent('del', user.id, o, type, sl, tp, p.id);
    publishPositionEvent('open', {
        dealId: d.id,
        positionId: p.id,
        userId: user.id,
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

    publishDealsEvent('in', user.id, d);
    publishAccountEvent('upd', user.id, updatedwallet);

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

export const closePosition = async (c: Context) => {
    const user = c.get('user') as User;
    const { walletId, positionId } = c.req.param();

    // @ts-ignore
    const body = c.req.valid('json');

    const { volume: closingVolume } = body;

    if (closingVolume <= 0) {
        throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, {
            message: 'Closing volume must be greater than 0',
        });
    }

    const { o, cp, updatedwallet, d, pnl, closePrice, p, isPartialClose } = await db.transaction(
        async trx => {
            const p = await getPosition(positionId, user.id, true, trx);

            if (p.status === 'closed') {
                throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, {
                    message: 'Position already closed',
                });
            }

            const positionVolume = p.volume;

            if (closingVolume <= 0) {
                throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, {
                    message: 'Closing volume must be greater than 0',
                });
            }

            if (closingVolume > positionVolume) {
                throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, {
                    message: `Cannot close more than available volume. Available: ${positionVolume}`,
                });
            }

            const isPartialClose = closingVolume < positionVolume;

            const lockedWallet = await getWalletByWalletId({
                walletId,
                userId: user.id,
                isLock: true,
                trx,
            });

            const tick = await getCurrentMarketPrice(p.instrument);

            const closePrice = p.side === 'buy' ? tick.ask : tick.bid;

            const positionMargin = p.requiredMargin;

            const marginToRelease = (closingVolume / positionVolume) * positionMargin;

            const remainingMargin = Number((Number(positionMargin) - marginToRelease).toFixed(2));
            const newVolume = Number((Number(positionVolume) - Number(closingVolume)).toFixed(2));

            if (remainingMargin < 0 || newVolume < 0) {
                throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
                    message: 'Calculation error. Please try again.',
                });
            }

            const pnl = calculatePnl(p.instrument, p.side, p.openPrice, closePrice, closingVolume);

            const cp = await updatePosition(
                positionId,
                user.id,
                {
                    volume: newVolume,
                    requiredMargin: remainingMargin,
                    closePrice: isPartialClose ? null : closePrice,
                    closedAt: isPartialClose ? null : new Date(),
                    status: isPartialClose ? 'open' : 'closed',
                    pnl: isPartialClose ? null : pnl,
                },
                trx
            );

            const oldBalance = lockedWallet.balance;
            const oldEquity = lockedWallet.equity;
            const oldMargin = lockedWallet.margin;
            const oldFreeMargin = lockedWallet.freeMargin;

            if (!oldBalance || !oldEquity || !oldMargin || !oldFreeMargin) {
                throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
                    message: 'Something went wrong with wallet, Please try again!',
                });
            }

            const newBalance = oldBalance + pnl;
            const newEquity = oldEquity + pnl;
            const newMargin = oldMargin - marginToRelease;
            const newFreeMargin = oldFreeMargin + marginToRelease;

            const updatedwallet = await updateWallet(
                walletId,
                user.id,
                {
                    balance: newBalance,
                    equity: newEquity,
                    margin: newMargin,
                    freeMargin: newFreeMargin,
                },
                trx
            );

            const o = await getOrderByPositionId(positionId, trx);

            const d = await createDeal(
                {
                    orderId: o.id,
                    positionId: p.id,
                    type: p.side === 'buy' ? 0 : 1,
                    direction: 1,
                    price: closePrice,
                    time: new Date(),
                    volume: closingVolume,
                    volumeClosed: closingVolume,
                    instrument: p.instrument,
                    profit: pnl,
                    sl: p.sl,
                    tp: p.tp,
                    commission: 0,
                    fee: 0,
                    swap: 0,
                    reason: 2,
                },
                trx
            );

            return { o, cp, updatedwallet, d, pnl, closePrice, p, isPartialClose };
        }
    );

    // --------------- Publish events -------------

    const type = o.side === 'buy' ? 0 : 1;

    if (isPartialClose) {
        publishPositionEvent('upd', {
            dealId: d.id,
            positionId: p.id,
            userId: user.id,
            type,
            price: closePrice,
            openPrice: p.openPrice,
            volume: closingVolume,
            instrument: p.instrument,
            sl: p.sl,
            tp: p.tp,
            commission: d.commission,
            fee: d.fee,
            swap: d.swap,
            openTime: p.openedAt.getTime(),
            closeTime: null,
            profit: pnl,
            marginRate: p.openPrice,
            reason: d.reason,
        });

        publishPositionEvent('part_close', {
            dealId: d.id,
            positionId: p.id,
            userId: user.id,
            type,
            price: closePrice,
            openPrice: p.openPrice,
            closePrice: closePrice,
            volume: closingVolume,
            instrument: p.instrument,
            sl: p.sl,
            tp: p.tp,
            commission: d.commission,
            fee: d.fee,
            swap: d.swap,
            openTime: p.openedAt.getTime(),
            closeTime: d.time.getTime(),
            profit: pnl,
            marginRate: closePrice,
            reason: d.reason,
        });
    } else {
        publishPositionEvent('close', {
            dealId: d.id,
            positionId: p.id,
            userId: user.id,
            type,
            price: closePrice,
            openPrice: p.openPrice,
            closePrice: closePrice,
            volume: closingVolume,
            instrument: p.instrument,
            sl: p.sl,
            tp: p.tp,
            commission: d.commission,
            fee: d.fee,
            swap: d.swap,
            openTime: p.openedAt.getTime(),
            closeTime: d.time.getTime(),
            profit: pnl,
            marginRate: closePrice,
            reason: d.reason,
        });
    }

    publishDealsEvent('out', user.id, d);
    publishAccountEvent('upd', user.id, updatedwallet);

    console.log('[Close Position]', {
        userId: user.id,
        positionId,
        closePrice,
    });

    return c.json({
        success: true,
        message: 'Position closed successfuly',
        position: {
            positionId: cp.id,
            time: isPartialClose ? d.time.getTime() : cp.closedAt?.getTime(),
            price: closePrice,
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
        const sym = p.instrument.includes('/') ? p.instrument.replace('/', '') : p.instrument;

        const tick = ticks.get(sym);
        if (!tick || !tick.ask || !tick.bid) {
            console.warn(`[Warning] Missing tick data for ${sym}`);
            throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
                message: `Missing tick data for ${sym}`,
            });
        }

        const currPrice = p.side === 'buy' ? tick.ask : tick.bid;
        const pnl = calculatePnl(sym, p.side, p.openPrice, currPrice, p.volume);

        return {
            symbol: p.instrument,
            type: p.side === 'buy' ? 0 : 1,
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

    const positions = result.map(d => ({
        dealId: d.dealId,
        position: d.positionId,
        type: d.type,
        openPrice: d.openPrice,
        closePrice: d.closePrice,
        volume: d.volume,
        symbol: d.instrument,
        sl: d.sl,
        tp: d.tp,
        openTime: d.openTime,
        closeTime: d.closeTime,
        swap: d.swap,
        commission: d.commission,
        fee: d.fee,
        pnl: d.profit,
        marginRate: d.closePrice,
        reason: d.reason,
    }));

    return c.json({
        success: true,
        message: 'Positions history fetched successfuly',
        positions: positions.length ? positions : [],
    });
};
