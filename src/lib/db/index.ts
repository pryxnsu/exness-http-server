import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '../../env';

const pool = new Pool({
    connectionString: env.databaseUrl,
});

export const db = drizzle({ client: pool });

export const connectDb = async () => {
    const client = await pool.connect();
    try {
        await client.query('SELECT 1');
        console.log('Database Connection successful');
    } finally {
        client.release();
    }
};
