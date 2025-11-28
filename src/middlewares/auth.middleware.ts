import { Context } from 'hono';
import { env } from '../env';
import { getCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { HTTP_RESPONSE_CODE } from '../constant';
import { verify } from 'hono/jwt';
import { getSessionByToken } from '../lib/db/queries/session.queries';
import { User, Session } from '../lib/db/schema';

declare module 'hono' {
    interface ContextVariableMap {
        user?: User;
        session?: Session;
    }
}
export const auth = async (c: Context, next: any) => {
    try {
        const token = getCookie(c, env.accessTokenName) ?? c.req.header('Authorization')?.split(' ')[1];
        if (!token || !token.trim()) {
            throw new HTTPException(HTTP_RESPONSE_CODE.UNAUTHORIZED, {
                message: 'Unauthorized! Please login',
            });
        }

        const payload = await verify(token, env.jwtSecret);
        if (typeof payload === 'string' || !payload.user) {
            throw new HTTPException(HTTP_RESPONSE_CODE.UNAUTHORIZED, {
                message: 'Unauthorized! Please login',
            });
        }

        const session = await getSessionByToken(token);
        if (!session) {
            throw new HTTPException(HTTP_RESPONSE_CODE.UNAUTHORIZED, {
                message: 'Session has expired! Please login',
            });
        }

        if (new Date() > session.expiresAt || session.revoked) {
            throw new HTTPException(HTTP_RESPONSE_CODE.UNAUTHORIZED, {
                message: 'Session has expired! Please login',
            });
        }

        c.set('user', payload.user as User);
        c.set('session', session as Session);
        await next();
    } catch (err: unknown) {
        if (err instanceof HTTPException) {
            if (err?.name === 'TokenExpiredError') {
                throw new HTTPException(HTTP_RESPONSE_CODE.UNAUTHORIZED, {
                    message: 'Session expired! Please login again.',
                });
            }
            if (err?.name === 'JsonWebTokenError') {
                throw new HTTPException(HTTP_RESPONSE_CODE.UNAUTHORIZED, {
                    message: 'Invalid token. Please login again.',
                });
            }
            if (err?.name === 'NotBeforeError') {
                throw new HTTPException(HTTP_RESPONSE_CODE.UNAUTHORIZED, {
                    message: 'Token not active yet.',
                });
            }
        }
        throw new HTTPException(HTTP_RESPONSE_CODE.UNAUTHORIZED, {
            message: 'Invalid or expired token.',
        });
    }
};
