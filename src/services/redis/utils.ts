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
