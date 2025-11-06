import { eq } from 'drizzle-orm';
import { favoriteInstrument, FavoriteInstrument, Instrument, instrument } from '../schema';
import { db } from '../index';
import { HTTP_RESPONSE_CODE } from '../../../constant';
import { HTTPException } from 'hono/http-exception';
import { and } from 'drizzle-orm/sql/expressions/conditions';

export async function createNewInstrument(
    symbol: string,
    type: 'forex' | 'crypto' | 'stock'
): Promise<Instrument> {
    try {
        const [ni] = await db
            .insert(instrument)
            .values({
                symbol,
                type,
            })
            .returning();

        return ni;
    } catch (err: unknown) {
        console.error('[DB error] Failed to create new Instrument:', err);
        throw new HTTPException(HTTP_RESPONSE_CODE.SERVER_ERROR, {
            message: 'Failed to create new Instrument',
        });
    }
}

export async function createFavoriteInstrument(
    userId: string,
    instrumentId: string,
    sortOrder: number
): Promise<FavoriteInstrument> {
    try {
        const [fi] = await db
            .insert(favoriteInstrument)
            .values({
                userId,
                instrumentId,
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

export async function getFavoriteInstrumentsByUserId(userId: string) {
    try {
        return await db
            .select({
                id: favoriteInstrument.id,
                sortOrder: favoriteInstrument.sortOrder,
                instrumentId: instrument.id,
                symbol: instrument.symbol,
                type: instrument.type,
            })
            .from(favoriteInstrument)
            .leftJoin(instrument, eq(favoriteInstrument.instrumentId, instrument.id))
            .where(eq(favoriteInstrument.userId, userId))
            .orderBy(favoriteInstrument.sortOrder)
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
