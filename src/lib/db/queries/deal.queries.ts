import { HTTPException } from 'hono/http-exception';
import { db } from '..';
import { deal, Deal, position } from '../schema';
import { HTTP_RESPONSE_CODE } from '../../../constant';
import { PgTransactionType } from '../../../types';
import { and, eq, gte, lte } from 'drizzle-orm';

export async function createDeal(data: Omit<typeof deal.$inferInsert, 'id'>, trx?: PgTransactionType): Promise<Deal> {
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

export async function getDealByPosition(from: Date, to: Date, userId: string) {
    try {
        const result = await db
            .select({
                dealId: deal.id,
                positionId: deal.positionId,
                type: deal.type,
                instrument: deal.instrument,
                volume: deal.volume,
                openTime: position.openedAt,
                closeTime: deal.time,
                openPrice: position.openPrice,
                closePrice: deal.price,
                profit: deal.profit,
                sl: deal.sl,
                tp: deal.tp,
                commission: deal.commission,
                fee: deal.fee,
                swap: deal.swap,
                reason: deal.reason,
            })
            .from(deal)
            .leftJoin(position, eq(deal.positionId, position.id))
            .where(and(eq(position.userId, userId), eq(deal.direction, 1), gte(deal.time, from), lte(deal.time, to)));

        return result;
    } catch (err: unknown) {
        console.error('Failed to get deal by positions', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
            message: 'Failed to get deal by positions',
        });
    }
}
