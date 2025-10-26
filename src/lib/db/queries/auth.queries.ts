import { db } from '../index';
import { eq } from 'drizzle-orm';
import { User, user } from '../schema';
import { HTTP_RESPONSE_CODE } from '../../../constant';
import { HTTPException } from 'hono/http-exception';

export async function getUserByEmail(email: string): Promise<User | null> {
    try {
        const [u] = await db.select().from(user).where(eq(user.email, email)).$withCache();
        return u || null;
    } catch (err: unknown) {
        console.error('[DB error] Failed to fetch user by Email:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to fetch user',
        });
    }
}

export async function getUserByUserId(userId: string): Promise<User | null> {
    try {
        const [u] = await db.select().from(user).where(eq(user.id, userId)).$withCache();
        return u || null;
    } catch (err: unknown) {
        console.error('[DB error] Failed to fetch user by Id:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to fetch user',
        });
    }
}

export async function createUser({
    tx,
    name,
    email,
    emailVerified,
    role,
    avatar,
}: {
    tx: any;
    name: string;
    email: string;
    emailVerified: boolean;
    role: 'user' | 'admin';
    avatar: string;
}): Promise<User | null> {
    try {
        const [u] = await tx
            .insert(user)
            .values({
                name,
                email,
                emailVerified,
                role,
                avatar,
            })
            .returning();

        return u || null;
    } catch (err: any) {
        console.error('[DB error] Failed to create user:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to create user',
        });
    }
}
