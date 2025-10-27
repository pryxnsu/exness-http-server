import { db } from '..';
import { and, eq } from 'drizzle-orm';
import { Wallet, wallet } from '../schema';
import { CreateWalletType } from '../../../modules/wallet/wallet.types';

export async function createWallet(userId: string, data: CreateWalletType): Promise<Wallet> {
    try {
        const [w] = await db
            .insert(wallet)
            .values({
                userId,
                ...data,
            })
            .returning();
        return w;
    } catch (err: unknown) {
        console.error('[DB error] Failed to create wallet:', err);
        throw err;
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
        throw err;
    }
}
