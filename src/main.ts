import { Hono } from 'hono';
import type { Context } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTP_RESPONSE_CODE } from './constant';
import { authRouter } from './modules/auth/auth.route';
import { HTTPException } from 'hono/http-exception';
import { env } from './env';
import { connectDb } from './lib/db';
import { instrumentsRouter } from './modules/instruments/instruments.route';
import { walletRouter } from './modules/wallet/wallet.route';
import { userRouter } from './modules/user/user.route';
import { connectRedis } from './services/redis';
import { accountRouter } from './modules/accounts/account.route';

const app = new Hono();

app.use(
    cors({
        origin: ['http://localhost:3000', env.clientUrl],
        credentials: true,
    })
);
app.use(logger());

app.get('/', (c: Context) => {
    return c.text('Server is running...');
});

app.get('/health', (c: Context) => {
    return c.json(
        {
            success: true,
            message: 'OK',
        },
        HTTP_RESPONSE_CODE.SUCCESS
    );
});

// routes
app.route('/auth', authRouter);
app.route('/api/user', userRouter);
app.route('/api/instruments', instrumentsRouter);
app.route('/api/wallet', walletRouter);
app.route('/api/accounts', accountRouter);

// exception handler
app.onError((err, c) => {
    const isHttpError = err instanceof HTTPException;
    const status = isHttpError ? err.status : HTTP_RESPONSE_CODE.SERVER_ERROR;
    const message = isHttpError ? err.message : 'Internal Server Error';

    console.error(`Error Occurred in: [${c.req.method}] ${c.req.path} -> ${err.message}`);
    const log = {
        method: c.req.method,
        path: c.req.path,
        status,
        error: err.name,
        message: err.message,
        stack: env.nodeEnv === 'development' ? err.stack : undefined,
    };

    console.error(JSON.stringify(log, null, 2));

    return c.json(
        {
            success: false,
            message,
            ...(env.nodeEnv === 'development' && { stack: err.stack }),
        },
        status
    );
});

// connect db -> connect redis -> start server
(async () => {
    try {
        await connectDb();
        await connectRedis();
        serve(
            {
                fetch: app.fetch,
                port: env.port,
            },
            info => {
                console.log(`Server is running on http://localhost:${info.port}`);
            }
        );
    } catch (err: unknown) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
})();
