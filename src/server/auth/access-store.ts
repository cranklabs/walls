import { db } from "@/server/db"
import { isEmailInvited, isInviteOnly } from "@/server/db/queries"
import { accounts, users } from "@/server/db/schema"

import type { AuthAccessStore } from "./access-policy"

import { and, eq, sql } from "drizzle-orm"

const authUserFields = {
  id: users.id,
  email: users.email,
  blocked: users.blocked,
}

export const authAccessStore: AuthAccessStore = {
  async findUserByEmail(email) {
    const [user] = await db
      .select(authUserFields)
      .from(users)
      .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
      .limit(1)
    return user
  },
  async findUserById(id) {
    const [user] = await db
      .select(authUserFields)
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    return user
  },
  async findDiscordUser(accountId) {
    const [user] = await db
      .select(authUserFields)
      .from(accounts)
      .innerJoin(users, eq(accounts.userId, users.id))
      .where(
        and(
          eq(accounts.providerId, "discord"),
          eq(accounts.accountId, accountId),
        ),
      )
      .limit(1)
    return user
  },
  isInviteOnly,
  isEmailInvited,
}
