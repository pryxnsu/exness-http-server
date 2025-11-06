import { InferSelectModel } from 'drizzle-orm';
import {
    boolean,
    index,
    pgTable,
    text,
    timestamp,
    varchar,
    numeric,
    integer,
    bigint,
    unique,
} from 'drizzle-orm/pg-core';
import { v4 as uuid } from 'uuid';
import { number } from 'zod';

export const user = pgTable('user', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => uuid()),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    role: varchar('role', { enum: ['user', 'admin'] })
        .notNull()
        .default('user'),
    avatar: text('avatar'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});

export const session = pgTable(
    'session',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => uuid()),
        token: text('token').notNull().unique(),
        ipAddress: text('ipAddress').notNull(),
        userAgent: text('userAgent').notNull(),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        revoked: boolean('revoked').notNull().default(false),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
        expiresAt: timestamp('expires_at').notNull(),
    },
    t => [
        index('session_user_id_idx').on(t.userId),
        index('session_expires_at_idx').on(t.expiresAt),
        index('session_revoked_idx').on(t.revoked),
    ]
);

export const account = pgTable(
    'account',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => uuid()),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        providerId: text('provider_id').notNull(),
        accountId: text('account_id').notNull(),
        idToken: text('id_token'),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        accessTokenExpiresAt: timestamp('access_token_expires_at').notNull(),
        refreshTokenExpiresAt: timestamp('refresh_token_expires_at').notNull(),
        scope: text('scope'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    t => [
        index('account_user_id_idx').on(t.userId),
        index('account_account_id_idx').on(t.accountId),
    ]
);

export const wallet = pgTable(
    'wallet',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => uuid()),
        type: varchar('type', { enum: ['real', 'demo'] })
            .notNull()
            .default('demo'),
        balance: numeric('balance', { precision: 14, scale: 2, mode: 'number' }).default(0.0),
        equity: numeric('equity', { precision: 14, scale: 2, mode: 'number' }).default(0.0),
        margin: numeric('margin', { precision: 14, scale: 2, mode: 'number' }).default(0.0),
        freeMargin: numeric('free_margin', { precision: 14, scale: 2, mode: 'number' }).default(
            0.0
        ),
        currency: text('currency').notNull().default('USD'),
        leverage: integer('leverage').notNull().default(200),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    t => [index('wallet_user_id_idx').on(t.userId)]
);

export const instrument = pgTable('instrument', {
    id: text('id')
        .primaryKey()
        .$defaultFn(() => uuid()),
    symbol: text('symbol').notNull().unique(),
    type: varchar('type', { enum: ['forex', 'crypto', 'stock'] }).notNull(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});

export const favoriteInstrument = pgTable(
    'favorite_instrument',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => uuid()),
        instrumentId: text('instrument_id')
            .notNull()
            .references(() => instrument.id, { onDelete: 'cascade' }),
        sortOrder: integer('sort_order'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
    },
    t => [
        index('favorite_instruments_user_id_idx').on(t.userId),
        unique('unique_user_instrument').on(t.userId, t.instrumentId),
    ]
);

export const order = pgTable(
    'order',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => uuid()),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        instrument: text('instrument').notNull(),
        side: varchar('side', { enum: ['buy', 'sell'] }).notNull(),
        volume: numeric('volume', { precision: 14, scale: 2, mode: 'number' }).notNull(),
        orderKind: varchar('order_kind', { enum: ['market', 'pending'] })
            .default('market')
            .notNull()
            .default('market'),
        requestedPrice: numeric('requested_price', {
            precision: 14,
            scale: 2,
            mode: 'number',
        }).notNull(),
        executedPrice: numeric('executed_price', { precision: 14, scale: 2, mode: 'number' }),
        oneClick: boolean('one_click').notNull().default(false),
        requestedAt: timestamp('requested_at').notNull().defaultNow(),
        executedAt: timestamp('executed_at'),
        status: varchar('status', { enum: ['pending', 'filled', 'canceled'] })
            .notNull()
            .default('pending'),
        positionId: text('position_id'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    t => [index('order_user_id_idx').on(t.userId)]
);

export const position = pgTable(
    'position',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => uuid()),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),

        instrument: text('instrument').notNull(),
        side: varchar('side', { enum: ['buy', 'sell'] }).notNull(),
        volume: numeric('volume', { precision: 14, scale: 2, mode: 'number' }).notNull(),
        openPrice: numeric('open_price', { precision: 14, scale: 5, mode: 'number' }).notNull(),
        closePrice: numeric('close_price', { precision: 14, scale: 5, mode: 'number' }),
        sl: numeric('sl', { precision: 14, scale: 5, mode: 'number' }),
        tk: numeric('tk', { precision: 14, scale: 5, mode: 'number' }),
        status: varchar('status', { enum: ['open', 'closed'] }).default('open'),
        openedAt: timestamp('opened_at').notNull().defaultNow(),
        closedAt: timestamp('closed_at'),
        pnl: numeric('pnl', { precision: 14, scale: 2, mode: 'number' }),
    },
    t => [
        index('position_user_id_idx').on(t.userId),
        index('position_instrument_idx').on(t.instrument),
        index('position_user_side_idx').on(t.userId, t.side),
    ]
);

export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type Account = InferSelectModel<typeof account>;
export type Wallet = InferSelectModel<typeof wallet>;
export type Instrument = InferSelectModel<typeof instrument>;
export type FavoriteInstrument = InferSelectModel<typeof favoriteInstrument>;
export type Order = InferSelectModel<typeof order>;
export type Position = InferSelectModel<typeof position>;
