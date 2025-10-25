import dotenv from 'dotenv';
dotenv.config();

export type ExnessEnv = {
    port: number;
    nodeEnv: 'development' | 'production';
    databaseUrl: string;
    clientUrl: string;
    serverUrl: string;
    cookieSecret: string;
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
} as ExnessEnv;
