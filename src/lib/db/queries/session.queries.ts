import { db } from '..';
import { eq } from 'drizzle-orm';
import { session, Session } from '../schema';
import { HTTP_RESPONSE_CODE } from '../../../constant';
import { HTTPException } from 'hono/http-exception';

/*
 * Create session while login
 * */
export async function createSession(
    userId: string,
    token: string,
    ipAddress: string,
    userAgent: string,
    expiresAt: Date
): Promise<Session | null> {
    try {
        const [s] = await db
            .insert(session)
            .values({
                token,
                userId,
                userAgent,
                ipAddress,
                expiresAt,
            })
            .returning();

        return s || null;
    } catch (err: unknown) {
        console.error('[DB error] Failed to create session:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to create session',
        });
    }
}

export async function getSessionByToken(token: string): Promise<Session | null> {
    try {
        const [s] = await db.select().from(session).where(eq(session.token, token)).$withCache();
        return s || null;
    } catch (err: unknown) {
        console.error('[DB error] Failed to get session:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to get session',
        });
    }
}

export async function updateSession(token: string): Promise<void> {
    try {
        await db
            .update(session)
            .set({
                revoked: true,
            })
            .where(eq(session.token, token));
    } catch (err: unknown) {
        console.error('[DB error] Failed to update session:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to update session',
        });
    }
}
