import { Context } from 'hono';
import {
    createFavoriteInstrument,
    createNewInstrument,
    destroyInstrument,
    getFavoriteInstrumentsByUserId,
    symbolInDb,
} from '../../lib/db/queries/instrument.queries';
import { HTTP_RESPONSE_CODE } from '../../constant';
import { User } from '../../lib/db/schema';
import { fetchPriceOfSymbol, getCryptoHistory } from './instruments.service';
import { candlesDummyData, favoritesDummyData } from '../../data';
import { env } from '../../env';
import { HTTPException } from 'hono/http-exception';
import { QuoteResult } from '../../types';

export const addNewInstrument = async (c: Context) => {
    // @ts-ignore
    const body = c.req.valid('json');

    const instrument = await createNewInstrument(body['symbol'], body['type']);

    return c.json(
        { success: true, message: 'Instrument added successfully', data: instrument },
        HTTP_RESPONSE_CODE.SUCCESS
    );
};

export const addInstrumentToFavorites = async (c: Context) => {
    // @ts-ignore
    const body = c.req.valid('json');
    const user = c.get('user');
    const instrument = await createFavoriteInstrument(
        user?.id as string,
        body['instrumentId'],
        body['sortOrder']
    );

    return c.json(
        { success: true, message: 'Instrument added successfully', data: instrument },
        HTTP_RESPONSE_CODE.SUCCESS
    );
};

export const fetchFavoriteInstruments = (c: Context) => {
    const user = c.get('user') as User;
    const instruments = getFavoriteInstrumentsByUserId(user?.id as string);

    return c.json(
        { success: true, message: 'Favorite Instruments fetch successfully', data: instruments },
        HTTP_RESPONSE_CODE.SUCCESS
    );
};

export const removeInstrumentFromFavorite = async (c: Context) => {
    const user = c.get('user');
    const instrumentId = c.req.param('id');
    const instrumentsId: { id: string } = await destroyInstrument(user?.id as string, instrumentId);
    return c.json(
        { success: true, message: 'Instruments removed successfully', data: instrumentsId },
        HTTP_RESPONSE_CODE.SUCCESS
    );
};

export const favoriteInstrumentsPrices = async (c: Context) => {
    const user = c.get('user') as User;

    const favoriteInstruments = await getFavoriteInstrumentsByUserId(user.id);

    if (!favoriteInstruments || favoriteInstruments.length === 0) {
        return c.json({ data: [] });
    }

    // sending dummy data in dev mode
    if (env.nodeEnv === 'development') {
        return c.json(
            { success: true, message: 'Instruments prices', data: favoritesDummyData },
            HTTP_RESPONSE_CODE.SUCCESS
        );
    }

    const symbols = favoriteInstruments.map(item => item.symbol);

    if (symbols.length === 0) {
        return c.json(
            { success: true, message: 'No favorite symbols' },
            HTTP_RESPONSE_CODE.SUCCESS
        );
    }

    const data = await fetchPriceOfSymbol(symbols.join(','));

    const favMap = new Map(favoriteInstruments.map(x => [x.symbol, x]));

    const result: QuoteResult[] = [];

    for (const [sym, symData] of Object.entries(data.snapshots)) {
        const currentInstrument = favMap.get(sym);

        let signal = '';

        if (symData.dailyBar?.c && symData.prevDailyBar?.c) {
            const priceChange = symData.dailyBar.c - symData.prevDailyBar.c;
            signal = priceChange >= 0 ? 'up' : 'down';
        }

        const quote: QuoteResult = {
            id: currentInstrument?.id,
            sortOrder: currentInstrument?.sortOrder,
            signal,
            symbol: sym,
            bid: symData.latestQuote?.bp,
            ask: symData.latestQuote?.ap,
            change:
                symData.dailyBar?.c && symData.prevDailyBar?.c
                    ? (
                          ((symData.dailyBar.c - symData.prevDailyBar.c) / symData.prevDailyBar.c) *
                          100
                      ).toFixed(2)
                    : '0.00',
        };
        result.push(quote);
    }

    return c.json({ success: true, message: 'Instruments prices', data: result });
};

// chart price data of main instrument
export const priceHistory = async (c: Context) => {
    const { symbol } = c.req.param();
    const { symbol: sym, type } = await symbolInDb(symbol);

    const { time_frame, from, count } = c.req.query();

    // sending dummy data in dev mode
    if (env.nodeEnv === 'development') {
        return c.json({
            success: true,
            priceHistory: candlesDummyData.map(price => ({
                time: Number(price.time),
                open: Number(price.open),
                high: Number(price.high),
                low: Number(price.low),
                close: Number(price.close),
                volume: Number(price.volume),
            })),
        });
    }

    const candles = await getCryptoHistory({
        symbol: sym,
        type,
        timeframe: time_frame,
        from: Number(from),
        count,
    });

    if (candles.length === 0) {
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Failed to fetch candles',
        });
    }

    return c.json({
        success: true,
        priceHistory: candles.map(price => ({
            time: new Date(price.t).getTime(),
            open: Number(price.o),
            high: Number(price.h),
            low: Number(price.l),
            close: Number(price.c),
            volume: Number(price.v),
        })),
    });
};
