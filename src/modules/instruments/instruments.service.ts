import { HTTPException } from 'hono/http-exception';
import { env } from '../../env';
import { HTTP_RESPONSE_CODE } from '../../constant';
import { AlpacaSnapshotsResponse } from '../../types';

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
