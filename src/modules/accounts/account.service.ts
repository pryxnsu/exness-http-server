import { InstrumentConfig, INSTRUMENTS } from '../../constant';

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
