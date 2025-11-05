import { createClient } from 'redis';
import { env } from '../../env';

export const redis = createClient({ url: env.redisUrl });

export async function connectRedis() {
    redis.on('ready', () => {
        console.log(`Redis connected to ${env.redisUrl}`);
    });

    redis.on('error', err => {
        console.error(`Error in redis connection: ${err}`);
    });

    try {
        await redis.connect();
        console.log('Redis connected successfully');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
        throw err;
    }
}
