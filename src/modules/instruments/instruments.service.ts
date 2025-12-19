import { HTTPException } from 'hono/http-exception';
import { env } from '../../env';
import { HTTP_RESPONSE_CODE } from '../../constant';
import { AlpacaSnapshot, AlpacaSnapshotsResponse, QuoteResult } from '../../types';
import { redis } from '../../services/redis';
import { quotePriceKey } from '../../services/redis/keys';

export interface CandleResProp {
    c: number;
    h: number;
    l: number;
    n: number;
    o: number;
    t: string;
    v: number;
    vw: number;
}

const msTo: Record<string, string> = {
    '1': '1Min',
    '5': '5Min',
    '15': '15Min',
    '30': '30Min',
    '60': '1Hour',
    '240': '4Hour',
    '1440': '1Day',
    '10800': '1Week',
    '43200': '1Month',
};

export async function fetchPriceOfSymbol(symbols: string): Promise<AlpacaSnapshotsResponse> {
    try {
        const res = await fetch(`https://data.alpaca.markets/v1beta3/crypto/us/snapshots?symbols=${symbols}`, {
            headers: {
                'Apca-Api-Key-Id': env.apcaApiKeyId,
                'Apca-Api-Secret-Key': env.apcaApiSecretKey,
            },
        });

        return await res.json();
    } catch (err: unknown) {
        console.error('[Api Error] Failed to fetch Alpaca data', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Failed to fetch data of instruments',
        });
    }
}

/**
 * @returns candles data of instrument
 */
export async function getCryptoHistory({
    symbol,
    type,
    timeframe,
    from,
    count,
}: {
    symbol: string;
    type: string;
    timeframe: string;
    from: number;
    count: string;
}): Promise<CandleResProp[]> {
    try {
        let start;
        const limit = Math.abs(Number(count));

        if (from === Number.MAX_SAFE_INTEGER) {
            start = new Date(Date.now() - limit * Number(timeframe) * 60 * 1000).toISOString();
        } else {
            if (Number(count) < 0) {
                start = new Date(from - limit * Number(timeframe) * 60 * 1000).toISOString();
            } else {
                start = new Date(from).toISOString();
            }
        }

        timeframe = msTo[timeframe];

        const baseUrl = new URL(`https://data.alpaca.markets/v1beta3/${type}/us/bars`);
        baseUrl.searchParams.set('symbols', symbol);
        baseUrl.searchParams.set('timeframe', timeframe);
        baseUrl.searchParams.set('start', start);
        baseUrl.searchParams.set('limit', String(limit));
        baseUrl.searchParams.set('sort', 'asc');

        const res = await fetch(baseUrl.toString(), {
            headers: {
                'Apca-Api-Key-Id': env.apcaApiKeyId,
                'Apca-Api-Secret-Key': env.apcaApiSecretKey,
                accept: 'application/json',
            },
        });

        if (!res.ok) {
            throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
                message: ' Failed to fetch Candles data',
            });
        }
        const data = await res.json();
        return data.bars[symbol];
    } catch (err: unknown) {
        console.log('[API Error] Failed to fetch Candles data', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: ' Failed to fetch Candles data',
        });
    }
}

export async function buildQuotesFromInstruments(
    instruments: {
        id: string;
        sortOrder?: number | null;
        instrumentId?: string | null;
        symbol: string | null;
        type: 'forex' | 'crypto' | 'stock' | null;
    }[]
) {
    const symbols = instruments.map(item => item.symbol as string);

    if (symbols.length === 0) {
        return [];
    }

    const key = quotePriceKey();

    let alpacaData: Record<string, AlpacaSnapshot> = {};

    const cachedDataOfSymbols = await redis.hmGet(key, symbols);

    const missingSymbols: string[] = [];

    symbols.forEach((symbol, idx) => {
        if (cachedDataOfSymbols[idx]) {
            alpacaData[symbol] = JSON.parse(cachedDataOfSymbols[idx]);
        } else {
            missingSymbols.push(symbol);
        }
    });

    if (missingSymbols.length > 0) {
        try {
            const data = await fetchPriceOfSymbol(missingSymbols.join(','));

            const hash: Record<string, string> = {};

            for (const [symbol, alpacaSnapshot] of Object.entries(data.snapshots)) {
                alpacaData[symbol] = alpacaSnapshot;
                hash[symbol] = JSON.stringify(alpacaSnapshot);
            }

            if (Object.keys(hash).length > 0) {
                await redis.hSet(key, hash);
            }
        } catch (err: unknown) {
            console.error('[Alpaca API Error] Failed to fetch prices for missing symbols:', err);
        }
    }

    const favMap = new Map(instruments.map(x => [x.symbol, x]));

    const result: QuoteResult[] = [];

    for (const [sym, symData] of Object.entries(alpacaData)) {
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
                    ? (((symData.dailyBar.c - symData.prevDailyBar.c) / symData.prevDailyBar.c) * 100).toFixed(2)
                    : '0.00',
        };
        result.push(quote);
    }

    return result;
}
