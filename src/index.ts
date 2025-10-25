import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './env';
import { HTTP_RESPONSE_CODE } from './constant';
import { connectDb, db } from './lib/db';

const app = express();
app.use(
    cors({
        origin: env.nodeEnv === 'development' ? 'http://localhost:3000' : env.clientUrl,
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
    })
);

app.use(express.json({ limit: '10kb', strict: true }));
app.use(express.urlencoded({ limit: '50kb', extended: true }));
app.use(cookieParser(env.cookieSecret));

app.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.status(HTTP_RESPONSE_CODE.SUCCESS).json({
        success: true,
        message: `HTTP server is running`,
    });
});

app.get('/health', (req: Request, res: Response, next: NextFunction) => {
    res.status(HTTP_RESPONSE_CODE.SUCCESS).json({
        success: true,
        message: 'OK',
    });
});

app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(HTTP_RESPONSE_CODE.NOT_FOUND).json({
        success: false,
        message: 'This path does not exist',
    });
});

// connect db and start server
connectDb()
    .then(() => {
        app.listen(env.port, () => {
            const url =
                env.nodeEnv === 'production' ? env.serverUrl : `http://localhost:${env.port}`;
            console.log(`HTTP server running at ${url}`);
        });
    })
    .catch((err: unknown) => {
        console.error('[DB] Connection failed', err);
        process.exit(1);
    });
