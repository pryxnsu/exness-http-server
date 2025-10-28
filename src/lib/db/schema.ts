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
} from 'drizzle-orm/pg-core';
import { v4 as uuid } from 'uuid';

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
        balance: numeric('balance', { precision: 14, scale: 2 }).default('0.00'),
        equity: numeric('equity', { precision: 14, scale: 2 }).default('0.00'),
        margin: numeric('margin', { precision: 14, scale: 2 }).default('0.00'),
        freeMargin: numeric('free_margin', { precision: 14, scale: 2 }).default('0.00'),
        currency: text('currency').notNull().default('USD'),
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

export const favoriteInstrument = pgTable(
    'favorite_instrument',
    {
        id: text('id')
            .primaryKey()
            .$defaultFn(() => uuid()),
        symbol: text('symbol'),
        type: text('type'),
        sortOrder: integer('sort_order'),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
    },
    t => [index('favorite_instruments_user_id_idx').on(t.userId)]
);

export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type Account = InferSelectModel<typeof account>;
export type Wallet = InferSelectModel<typeof wallet>;
export type FavoriteInstrument = InferSelectModel<typeof favoriteInstrument>;
