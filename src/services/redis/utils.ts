import { redis } from '.';
import { getInstrumentPriceKey } from './keys';

interface MarketDataPrice {
    bid: number;
    ask: number;
    time: number;
}

export async function getCurrentMarketPrice(instrument: string): Promise<MarketDataPrice | null> {
    try {
        const key = getInstrumentPriceKey();
        const data = await redis.hGet(key, instrument);
        if (!data) return null;

        return JSON.parse(data);
    } catch (err: unknown) {
        console.error('[Redis Error] occurred in fetching price of instrument', err);
        throw new Error('Failed to fetch market price');
    }
}
