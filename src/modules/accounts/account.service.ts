import { HTTPException } from 'hono/http-exception';
import { HTTP_RESPONSE_CODE, InstrumentConfig, INSTRUMENTS } from '../../constant';

export function decodeOrderType(type: number): {
    side: 'buy' | 'sell';
    orderKind: 'market' | 'pending';
} {
    let result: { side: 'buy' | 'sell'; orderKind: 'market' | 'pending' };

    switch (type) {
        case 0: {
            result = {
                side: 'buy',
                orderKind: 'market',
            };
            break;
        }
        case 1: {
            result = {
                side: 'sell',
                orderKind: 'market',
            };
            break;
        }

        case 2: {
            result = {
                side: 'buy',
                orderKind: 'pending',
            };
            break;
        }

        case 3: {
            result = {
                side: 'sell',
                orderKind: 'pending',
            };
            break;
        }

        default:
            throw new Error(`Invalid order type: ${type}`);
    }

    return result;
}

export function calculateRequiredMargin({
    volumeLots,
    price,
    leverage,
    contractSize,
    marginFactor = 1,
}: {
    volumeLots: number;
    price: number;
    leverage: number;
    contractSize: number;
    marginFactor?: number;
}) {
    return (volumeLots * contractSize * price * marginFactor) / leverage;
}

export function getInstrumentConfig(symbol: string): InstrumentConfig {
    return INSTRUMENTS[symbol];
}

export function calculatePnl(
    instrument: string,
    side: 'buy' | 'sell',
    openPrice: number,
    closePrice: number,
    closingVolume: number
) {
    const { contractSize } = getInstrumentConfig(instrument);

    if (!contractSize) {
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Contract size not available',
        });
    }

    const pnl: number =
        side === 'buy'
            ? (closePrice - Number(openPrice)) * Number(closingVolume) * contractSize
            : (Number(openPrice) - closePrice) * Number(closingVolume) * contractSize;

    return pnl;
}

export function normalizeSymbol(symbol: string) {
    return symbol.includes('/') ? symbol.replace('/', '') : symbol;
}