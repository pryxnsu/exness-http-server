import { HTTPException } from 'hono/http-exception';
import { db } from '..';
import { deal, Deal } from '../schema';
import { HTTP_RESPONSE_CODE } from '../../../constant';
import { PgTransactionType } from '../../../types';

export async function createDeal(
    data: Omit<typeof deal.$inferInsert, 'id'>,
    trx?: PgTransactionType
): Promise<Deal> {
    try {
        const exe = trx ?? db;
        const [d] = await exe.insert(deal).values(data).returning();

        return d;
    } catch (err: unknown) {
        console.error('Failed to create deal', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Failed to create deal',
        });
    }
}
