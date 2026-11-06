import { relations, sql } from "drizzle-orm"
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTableCreator,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"

export const createTable = pgTableCreator((name) => `walls_${name}`)

// ── better-auth core tables ──────────────────────────────────────────

export const users = createTable(
  "user",
  {
    id: varchar("id", { length: 255 }).notNull().primaryKey(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: varchar("image", { length: 255 }),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    // Custom fields
    joinedAt: timestamp("joined_at", {
      mode: "date",
      withTimezone: true,
    }).defaultNow(),
    isAdmin: boolean("is_admin").notNull().default(false),
    blocked: boolean("blocked").notNull().default(false),
    lastSeen: timestamp("last_seen", {
      mode: "date",
      withTimezone: true,
    }),
  },
  (user) => [
    uniqueIndex("walls_user_email_unique_idx").on(sql`lower(${user.email})`),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}))

export const sessions = createTable(
  "session",
  {
    id: varchar("id", { length: 255 }).notNull().primaryKey(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    ipAddress: varchar("ip_address", { length: 255 }),
    userAgent: text("user_agent"),
  },
  (session) => [index("session_user_id_idx").on(session.userId)],
)

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const accounts = createTable(
  "account",
  {
    id: varchar("id", { length: 255 }).notNull().primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      mode: "date",
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      mode: "date",
      withTimezone: true,
    }),
    scope: varchar("scope", { length: 255 }),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (account) => [
    index("account_user_id_idx").on(account.userId),
    uniqueIndex("walls_account_provider_identity_unique_idx").on(
      account.providerId,
      account.accountId,
    ),
  ],
)

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const verification = createTable("verification", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", {
    mode: "date",
    withTimezone: true,
  }).notNull(),
  createdAt: timestamp("created_at", {
    mode: "date",
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    mode: "date",
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
})

// ── App-specific tables ──────────────────────────────────────────────

export const file = createTable(
  "file",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    base64: text("base64").notNull(),
    uploadedBy: varchar("uploaded_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    uploadedAt: timestamp("uploaded_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    height: integer("height").notNull(),
    width: integer("width").notNull(),
    size: integer("size").notNull(),
    nsfw: integer("nsfw").notNull().default(0), // 0, 1, or 2
    publicVisibility: boolean("public_visibility").notNull().default(false),
    parentId: integer("parent_id"),
    remixConfig: jsonb("remix_config"),
  },
  (t) => [
    index("file_parent_id_idx").on(t.parentId),
    // Keep the name from migration0007 so new auth migrations do not rename it.
    foreignKey({
      name: "walls_file_parent_id_fkey",
      columns: [t.parentId],
      foreignColumns: [t.id],
    }).onDelete("restrict"),
  ],
)

export const settings = createTable("settings", {
  userId: varchar("user_id", { length: 255 })
    .primaryKey()
    .references(() => users.id),
  redirectToMyWall: boolean("redirect_to_my_wall").notNull().default(false),
})

export const invite = createTable("invite", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  invitedBy: varchar("invited_by", { length: 255 })
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp("invited_at", { mode: "date" }).notNull().defaultNow(),
})

export const appSettings = createTable("app_settings", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: varchar("value", { length: 255 }).notNull(),
})

export const inviteRequest = createTable("invite_request", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  requestedAt: timestamp("requested_at", { mode: "date" })
    .notNull()
    .defaultNow(),
})
