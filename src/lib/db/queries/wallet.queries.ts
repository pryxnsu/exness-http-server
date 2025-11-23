import { db } from '..';
import { and, eq } from 'drizzle-orm';
import { Wallet, wallet } from '../schema';
import { HTTPException } from 'hono/http-exception';
import { HTTP_RESPONSE_CODE } from '../../../constant';
import { PgTransactionType } from '../../../types';

export async function createWallet(
    data: Omit<typeof wallet.$inferInsert, 'id'>,
    trx?: PgTransactionType
): Promise<Wallet> {
    try {
        const exe = trx ?? db;

        const [w] = await exe.insert(wallet).values(data).returning();
        return w;
    } catch (err: unknown) {
        console.error('[DB error] Failed to create wallet:', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to create wallet',
        });
    }
}

export async function getWalletByWalletId({
    walletId,
    userId,
    isLock,
    trx,
}: {
    walletId: string;
    userId: string;
    isLock?: boolean;
    trx?: PgTransactionType;
}): Promise<Wallet> {
    try {
        const exe = trx ?? db;

        if (isLock) {
            const [w] = await exe
                .select()
                .from(wallet)
                .where(and(eq(wallet.id, walletId), eq(wallet.userId, userId)))
                .for('update');

            if (!w) {
                throw new HTTPException(HTTP_RESPONSE_CODE.NOT_FOUND, {
                    message: 'Wallet not found. Please make one',
                });
            }

            return w;
        }

        const [w] = await exe
            .select()
            .from(wallet)
            .where(and(eq(wallet.id, walletId), eq(wallet.userId, userId)))
            .$withCache();

        if (!w) {
            throw new HTTPException(HTTP_RESPONSE_CODE.NOT_FOUND, {
                message: 'Wallet not found. Please make one',
            });
        }

        return w;
    } catch (err: unknown) {
        console.error('[DB error] Failed to get wallet by wallet id:', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to get wallet',
        });
    }
}

export async function getWallet(
    userId: string,
    walletType: 'real' | 'demo'
): Promise<Wallet | null> {
    try {
        const [w] = await db
            .select()
            .from(wallet)
            .where(and(eq(wallet.userId, userId), eq(wallet.type, walletType)))
            .$withCache();

        return w || null;
    } catch (err: unknown) {
        console.error('[DB error] Failed to fetch wallet:', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to fetch wallet',
        });
    }
}

export async function updateWallet(
    walletId: string,
    userId: string,
    data: Omit<Partial<typeof wallet.$inferInsert>, 'id' | 'userId' | 'createdAt'>,
    trx?: PgTransactionType
): Promise<Wallet> {
    try {
        const exe = trx ?? db;

        const [w] = await exe
            .update(wallet)
            .set(data)
            .where(and(eq(wallet.id, walletId), eq(wallet.userId, userId)))
            .returning();

        return w;
    } catch (err: unknown) {
        console.error('[DB error] Failed to update wallet:', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to fetch wallet by position',
        });
    }
}
