import { eq } from 'drizzle-orm';
import { favoriteInstrument, FavoriteInstrument } from '../schema';
import { db } from '../index';
import { HTTP_RESPONSE_CODE } from '../../../constant';
import { HTTPException } from 'hono/http-exception';
import { and } from 'drizzle-orm/sql/expressions/conditions';

export async function createFavoriteInstrument(
    userId: string,
    symbol: string,
    sortOrder: number
): Promise<FavoriteInstrument> {
    try {
        const [fi] = await db
            .insert(favoriteInstrument)
            .values({
                userId,
                symbol,
                sortOrder,
            })
            .returning();

        return fi;
    } catch (err: unknown) {
        console.error('[DB error] Failed to create favorite Instrument:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to create favorite Instrument',
        });
    }
}

export async function getFavoriteInstrumentsByUserId(
    userId: string
): Promise<FavoriteInstrument[]> {
    try {
        return await db
            .select()
            .from(favoriteInstrument)
            .where(eq(favoriteInstrument.userId, userId))
            .$withCache();
    } catch (err: unknown) {
        console.error('[DB error] Failed to fetch favorite instruments:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to fetch favorite Instruments',
        });
    }
}

// delete instrument from favorites and return id of it
export async function destroyInstrument(
    userId: string,
    instrumentId: string
): Promise<{ id: string }> {
    try {
        const [deletedIns] = await db
            .delete(favoriteInstrument)
            .where(
                and(eq(favoriteInstrument.userId, userId), eq(favoriteInstrument.id, instrumentId))
            )
            .returning({ id: favoriteInstrument.id });
        return deletedIns;
    } catch (err: unknown) {
        console.error('[DB error] Failed to delete favorite instrument:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to delete favorite Instrument',
        });
    }
}
