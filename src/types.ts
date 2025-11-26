import { ExtractTablesWithRelations } from 'drizzle-orm';
import { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import { PgTransaction } from 'drizzle-orm/pg-core';

export type PgTransactionType = PgTransaction<
    NodePgQueryResultHKT,
    Record<string, never>,
    ExtractTablesWithRelations<Record<string, never>>
>;

export interface PositionEventProp {
    dealId: string;
    userId: string;
    walletId?: string;
    positionId: string;
    type: number;
    price?: number;
    openPrice: number;
    closePrice?: number;
    volume: number;
    instrument: string;
    sl: number | null;
    tp: number | null;
    commission: number | null;
    fee: number | null;
    swap: number | null;
    openTime: number;
    closeTime: number | null;
    profit: number | null;
    marginRate: number;
    reason: number;
}
