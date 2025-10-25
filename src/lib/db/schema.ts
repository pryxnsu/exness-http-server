import { InferSelectModel } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
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

export type User = InferSelectModel<typeof user>;
