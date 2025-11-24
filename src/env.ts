import dotenv from 'dotenv';
dotenv.config();

export type ExnessEnv = {
    port: number;
    nodeEnv: 'development' | 'production';
    databaseUrl: string;
    clientUrl: string;
    serverUrl: string;
    cookieSecret: string;
    googleClientId: string;
    googleClientSecret: string;
    jwtSecret: string;
    accessTokenName: string;
    refreshTokenName: string;
    alphaVantageApiKey: string;
    twelveDataApiKey: string;
    redisUrl: string;
    orderExecutedChannel: string;
    positionChannel: string;
    dealsChannel: string;
    accountChannel: string;
    apcaApiKeyId: string;
    apcaApiSecretKey: string;
};

export function getEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Env variable not found KEY: ${key}`);
    }
    return value;
}

export const env = {
    port: process.env.PORT || 8000,
    nodeEnv: getEnv('NODE_ENV'),
    databaseUrl: getEnv('DATABASE_URL'),
    clientUrl: getEnv('CLIENT_URL'),
    serverUrl: getEnv('SERVER_URL'),
    cookieSecret: getEnv('COOKIE_SECRET'),
    googleClientId: getEnv('GOOGLE_CLIENT_ID'),
    googleClientSecret: getEnv('GOOGLE_CLIENT_SECRET'),
    jwtSecret: getEnv('JWT_SECRET'),
    accessTokenName: getEnv('ACCESS_TOKEN_NAME'),
    refreshTokenName: getEnv('REFRESH_TOKEN_NAME'),
    alphaVantageApiKey: getEnv('ALPHA_VANTAGE_API_KEY'),
    twelveDataApiKey: getEnv('TWELVE_DATA_API_KEY'),
    redisUrl: getEnv('REDIS_URL'),
    orderExecutedChannel: getEnv('ORDER_CHANNEL'),
    positionChannel: getEnv('POSITION_CHANNEL'),
    dealsChannel: getEnv('DEALS_CHANNEL'),
    accountChannel: getEnv('ACCOUNT_WALLET_CHANNEL'),
    apcaApiKeyId: getEnv('APCA-API-KEY-ID'),
    apcaApiSecretKey: getEnv('APCA-API-SECRET-KEY'),
} as ExnessEnv;
