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
    refreshTokenName: string;
    accessTokenName: string;
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
    refreshTokenName: getEnv('ACCESS_TOKEN_NAME'),
    accessTokenName: getEnv('REFRESH_TOKEN_NAME'),
} as ExnessEnv;
