import { HTTPException } from 'hono/http-exception';
import { db } from '..';
import { HTTP_RESPONSE_CODE } from '../../../constant';
import { Order, order } from '../schema';
import { and, eq } from 'drizzle-orm';
import { PgTransactionType } from '../../../types';

export async function createOrder(
    data: Omit<typeof order.$inferInsert, 'id'>,
    trx?: PgTransactionType
): Promise<Order> {
    try {
        const exe = trx ?? db;

        const [o] = await exe.insert(order).values(data).returning();
        return o;
    } catch (err: unknown) {
        console.error('[DB error] occrred while create order', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to create order',
        });
    }
}

export async function updateOrder(
    orderId: string,
    userId: string,
    data: Omit<Partial<typeof order.$inferInsert>, 'id' | 'userId' | 'createdAt' | 'requestedAt'>,
    trx?: PgTransactionType
): Promise<Order> {
    try {
        const exe = trx ?? db;

        const [uo] = await exe
            .update(order)
            .set(data)
            .where(and(eq(order.id, orderId), eq(order.userId, userId)))
            .returning();
        return uo;
    } catch (err: unknown) {
        console.error('[DB Error] occurred while updating order:', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to update order',
        });
    }
}

export async function getOrderByPositionId(
    positionId: string,
    trx?: PgTransactionType
): Promise<Order> {
    try {
        const exe = trx ?? db;
        const [o] = await exe
            .select()
            .from(order)
            .where(eq(order.positionId, positionId))
            .$withCache();

        if (!o) {
            throw new HTTPException(HTTP_RESPONSE_CODE.BAD_REQUEST, { message: 'Order not found' });
        }

        return o;
    } catch (err: unknown) {
        console.error('[DB Error] occurred while getting order:', err);

        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to fetch order',
        });
    }
}
