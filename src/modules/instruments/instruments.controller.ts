import { Context } from 'hono';
import {
    createFavoriteInstrument,
    destroyInstrument,
    getFavoriteInstrumentsByUserId,
} from '../../lib/db/queries/instrument.queries';
import { HTTP_RESPONSE_CODE } from '../../constant';
import { FavoriteInstrument, User } from '../../lib/db/schema';
import { fetchPriceOfSymbol, fetchInstrumentCandles } from './instruments.service';
import { candlesDummyData, favoritesDummyData } from '../../data';
import { env } from '../../env';

export const addInstrument = async (c: Context) => {
    // @ts-ignore
    const body = c.req.valid('json');
    const user = c.get('user');
    const instrument = await createFavoriteInstrument(
        user?.id as string,
        body['symbol'],
        body['sortOrder']
    );

    return c.json(
        { success: true, message: 'Instrument added successfully', data: instrument },
        HTTP_RESPONSE_CODE.SUCCESS
    );
};

export const favoriteInstrument = (c: Context) => {
    const user = c.get('user');
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

    const favoriteInstruments: FavoriteInstrument[] = await getFavoriteInstrumentsByUserId(user.id);

    if (!favoriteInstruments || favoriteInstrument.length === 0) {
        return c.json({ data: [] });
    }

    // sending dummy data in dev mode
    if (env.nodeEnv === 'development') {
        return c.json({ success: true, message: 'Instruments prices', data: favoritesDummyData });
    }

    const symbols = favoriteInstruments.map(favIns => {
        return {
            symbol: favIns.symbol,
            type: favIns.type,
        };
    });

    const prices = await Promise.all(
        symbols.map(data => fetchPriceOfSymbol(data.symbol as string, data.type as string))
    );

    return c.json({ success: true, message: 'Instruments prices', data: prices });
};

// chart price data of main instrument
export const priceHistory = async (c: Context) => {
    const { symbol, type } = c.req.param();

    // time_frame in minutes
    // from in ms
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

    const data = await fetchInstrumentCandles({
        symbol,
        type,
        timeFrame: time_frame,
        from,
        count,
    });

    return c.json({
        success: true,
        priceHistory: data?.map(price => ({
            time: Number(price.time),
            open: Number(price.open),
            high: Number(price.high),
            low: Number(price.low),
            close: Number(price.close),
            volume: Number(price.volume),
        })),
    });
};
