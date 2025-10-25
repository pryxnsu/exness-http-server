import dotenv from 'dotenv';
dotenv.config();

export type ExnessEnv = {
    port: number;
    nodeEnv: 'development' | 'production';
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
    clientUrl: getEnv('CLIENT_URL'),
    serverUrl: getEnv('SERVER_URL'),
    cookieSecret: getEnv('COOKIE_SECRET'),
} as ExnessEnv;
