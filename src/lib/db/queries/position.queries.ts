import { HTTPException } from 'hono/http-exception';
import { db } from '..';
import { Position, position } from '../schema';
import { HTTP_RESPONSE_CODE } from '../../../constant';
import { and, eq, gte, lte } from 'drizzle-orm';
import { PgTransactionType } from '../../../types';
import { TimestampFsp } from 'drizzle-orm/mysql-core';

export async function createPosition(
    data: Omit<typeof position.$inferInsert, 'id'>,
    trx?: PgTransactionType
): Promise<Position> {
    try {
        const exe = trx ?? db;

        const [np] = await exe.insert(position).values(data).returning();

        if (!np) {
            throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
                message: 'Failed to create position',
            });
        }

        return np;
    } catch (err: unknown) {
        console.error('[DB Error] occurred while create position', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to create position',
        });
    }
}

export async function getPosition(
    positionId: string,
    userId: string,
    isLock?: boolean,
    trx?: PgTransactionType
): Promise<Position> {
    try {
        const exe = trx ?? db;

        if (isLock) {
            const [p] = await exe
                .select()
                .from(position)
                .where(and(eq(position.id, positionId), eq(position.userId, userId)))
                .for('update');

            if (!p) {
                throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
                    message: 'Position not found or already closed',
                });
            }

            return p;
        }

        const [p] = await exe
            .select()
            .from(position)
            .where(and(eq(position.id, positionId), eq(position.userId, userId)))
            .$withCache();

        if (!p) {
            throw new HTTPException(HTTP_RESPONSE_CODE.SERVICE_UNAVAILABLE, {
                message: 'Position not found or already closed',
            });
        }

        return p;
    } catch (err: unknown) {
        console.error('[DB Error] occurred while get position', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to fetch position',
        });
    }
}

export async function getPositionsByUserId(
    userId: string,
    filters: { fromDate?: Date; active?: boolean; toDate?: Date }
): Promise<Position[]> {
    try {
        const {fromDate, toDate, active} = filters;
        const conditions = [eq(position.userId, userId)];

        if (active) conditions.push(eq(position.status, 'open'));

        if (!active) conditions.push(eq(position.status, 'closed'));

        if (fromDate) conditions.push(gte(position.openedAt, fromDate));

        if (toDate) conditions.push(lte(position.closedAt, toDate));

        const p = await db
            .select()
            .from(position)
            .where(and(...conditions));

        return p;
    } catch (err: unknown) {
        console.error('[DB Error] occurred while get positions', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to fetch positions',
        });
    }
}

export async function updatePosition(
    positionId: string,
    userId: string,
    data: Omit<Partial<typeof position.$inferInsert>, 'id' | 'userId' | 'openedAt'>,
    trx?: PgTransactionType
): Promise<Position> {
    try {
        const exe = trx ?? db;
        const [up] = await exe
            .update(position)
            .set(data)
            .where(and(eq(position.id, positionId), eq(position.userId, userId)))
            .returning();

        return up;
    } catch (err: unknown) {
        console.error('[DB Error] occurred while update position', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to update position',
        });
    }
}
