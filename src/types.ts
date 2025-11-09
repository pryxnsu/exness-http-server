import { ExtractTablesWithRelations } from 'drizzle-orm';
import { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import { PgTransaction } from 'drizzle-orm/pg-core';

export type PgTransactionType = PgTransaction<
    NodePgQueryResultHKT,
    Record<string, never>,
    ExtractTablesWithRelations<Record<string, never>>
>;
