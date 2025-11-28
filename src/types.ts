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

export interface AlpacaQuote {
    ap: number;
    as: number;
    bp: number;
    bs: number;
    t: string;
}

export interface AlpacaTrade {
    i: number;
    p: number;
    s: number;
    t: string;
    tks: string;
}

export interface AlpacaBar {
    c: number;
    h: number;
    l: number;
    n: number;
    o: number;
    t: string;
    v: number;
    vw: number;
}

export interface AlpacaSnapshot {
    latestQuote?: AlpacaQuote;
    latestTrade?: AlpacaTrade;
    minuteBar?: AlpacaBar;
    dailyBar?: AlpacaBar;
    prevDailyBar?: AlpacaBar;
}

export interface AlpacaSnapshotsResponse {
    snapshots: Record<string, AlpacaSnapshot>;
}

export interface QuoteResult {
    id: string | undefined;
    sortOrder: number | null | undefined;
    signal: string;
    symbol: string;
    bid: number | undefined;
    ask: number | undefined;
    change: string;
}
