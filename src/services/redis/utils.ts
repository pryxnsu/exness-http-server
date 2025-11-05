import { redis } from ".";
import { getInstrumentPriceKey } from "./keys";

export async function getCurrentMarketPrice(instrument: string) : Promise<number> {
    try {
        const key = getInstrumentPriceKey();
        const price = await redis.hGet(key, instrument);
        return Number(price);
    } catch (err: unknown) {
        console.error('[Redis Error] occurred in fetching price of instrument', err);
    }
}