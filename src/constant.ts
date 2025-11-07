export const HTTP_RESPONSE_CODE = {
    SUCCESS: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TIMEOUT: 408,
    CONFLICT: 409,
    TOO_MANY_REQUEST: 429,
    SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
} as const;

// time in seconds
export const TIME = {
    ONE_DAY: 60 * 60 * 24,
    SEVEN_DAYS: 60 * 60 * 24 * 7,
} as const;

export type InstrumentConfig = {
    contractSize: number; 
    digits: number; 
    marginFactor: number;
    symbolType: 'forex' | 'crypto' | 'metal';
};

export const INSTRUMENTS: Record<string, InstrumentConfig> = {
    EURUSD: { contractSize: 100_000, digits: 5, marginFactor: 1, symbolType: 'forex' },
    GBPUSD: { contractSize: 100_000, digits: 5, marginFactor: 1, symbolType: 'forex' },
    USDJPY: { contractSize: 100_000, digits: 3, marginFactor: 1, symbolType: 'forex' },
    EURUSDm: { contractSize: 100_000, digits: 5, marginFactor: 1, symbolType: 'forex' },

    XAUUSD: { contractSize: 100, digits: 2, marginFactor: 1, symbolType: 'metal' },
    XAGUSD: { contractSize: 5000, digits: 3, marginFactor: 1, symbolType: 'metal' },

    BTCUSD: { contractSize: 1, digits: 2, marginFactor: 0.5, symbolType: 'crypto' },
    ETHUSD: { contractSize: 1, digits: 2, marginFactor: 0.5, symbolType: 'crypto' },
    LTCUSD: { contractSize: 1, digits: 2, marginFactor: 0.5, symbolType: 'crypto' },
};
