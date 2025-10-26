import { account, Account } from '../schema';
import { eq } from 'drizzle-orm';
import { db } from '../index';
import { HTTP_RESPONSE_CODE } from '../../../constant';
import { HTTPException } from 'hono/http-exception';

export async function getAccountById(accId: string): Promise<Account | null> {
    try {
        const [a] = await db
            .select()
            .from(account)
            .where(eq(account.accountId, accId))
            .$withCache();
        return a || null;
    } catch (err: unknown) {
        console.error('[DB error] Failed to fetch account:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to fetch account',
        });
    }
}

export async function getAccountByUserId(userId: string): Promise<Account | null> {
    try {
        const [a] = await db.select().from(account).where(eq(account.userId, userId)).$withCache();
        return a || null;
    } catch (err: unknown) {
        console.error('[DB error] Failed to fetch account:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to fetch account',
        });
    }
}

export async function createAccount({
    tx,
    userId,
    providerId,
    accountId,
    idToken,
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    scope,
}: {
    tx: any;
    userId: string;
    providerId: string;
    accountId: string;
    idToken: string;
    accessToken: string;
    refreshToken: string | null;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
    scope: string;
}) {
    try {
        return await tx.insert(account).values({
            userId,
            providerId,
            accountId,
            idToken,
            accessToken,
            refreshToken,
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
            scope,
        });
    } catch (err: unknown) {
        console.error('[DB Error] Failed to create account', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to create account',
        });
    }
}

export async function updateAccount(
    id: string,
    values: Partial<typeof account.$inferInsert>
): Promise<void> {
    try {
        await db
            .update(account)
            .set({
                ...values,
            })
            .where(eq(account.id, id));
    } catch (err: unknown) {
        console.error('[DB Error] Failed to update account', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to update account',
        });
    }
}
