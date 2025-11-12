import { HTTPException } from 'hono/http-exception';
import { redis } from '.';
import { getInstrumentPriceKey } from './keys';
import { HTTP_RESPONSE_CODE } from '../../constant';

interface MarketDataPrice {
    bid: number;
    ask: number;
    time: number;
}

export async function getCurrentMarketPrice(instrument: string): Promise<MarketDataPrice> {
    try {
        const key = getInstrumentPriceKey();
        const data = await redis.hGet(key, instrument);

        if (!data) {
            throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
                message: 'Market data unavailable right now, Please try again!',
            });
        }

        const tick = await JSON.parse(data);

        if (!tick || Number.isNaN(tick.ask) || Number.isNaN(tick.bid)) {
            throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
                message: 'Market price unavailable',
            });
        }
        return tick;
    } catch (err: unknown) {
        console.error('[Redis Error] occurred in fetching price of instrument', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Failed to fetch market price',
        });
    }
}

export async function getAllMarketPrices(key: string) {
    const data = await redis.hGetAll(key);

    const marketPrices = new Map<string, { bid: number; ask: number; time: number }>();

    for (const [symbol, value] of Object.entries(data)) {
        try {
            const parsed = JSON.parse(value);

            if (typeof parsed.bid !== 'number' || typeof parsed.ask !== 'number') {
                console.warn(`Invalid tick format for ${symbol}:`, parsed);
                continue;
            }

            marketPrices.set(symbol, parsed);
        } catch (err) {
            console.error(`Error parsing tick data for ${symbol}`, err);
        }
    }

    return marketPrices;
}
