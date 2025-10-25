import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTP_RESPONSE_CODE } from './constant';

const app = new Hono();

app.use(cors());
app.use(logger());

app.get('/', c => {
    return c.text('Server is running...');
});

app.get('/health', c => {
    return c.json(
        {
            success: true,
            message: 'OK',
        },
        HTTP_RESPONSE_CODE.SUCCESS
    );
});

serve(
    {
        fetch: app.fetch,
        port: 8000,
    },
    info => {
        console.log(`Server is running on http://localhost:${info.port}`);
    }
);
