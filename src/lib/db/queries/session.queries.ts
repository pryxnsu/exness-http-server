import { db } from '..';
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
