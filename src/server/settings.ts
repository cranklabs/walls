import { count, eq } from "drizzle-orm"

import { getSession } from "./auth"
import { db } from "./db"
import { settings } from "./db/schema"

/**
 * INTERNAL
 */
export async function _getSettings(userId: string) {
  const exists =
    ((
      await db
        .select({ count: count() })
        .from(settings)
        .where(eq(settings.userId, userId))
    )[0]?.count ?? 0) > 0
  if (!exists) {
    await db.insert(settings).values({ userId })
  }

  const user_settings = (
    await db.select().from(settings).where(eq(settings.userId, userId))
  )[0]

  if (!user_settings) throw new Error("User settings not found")

  return user_settings
}

export async function _getRedirectToMyWallCurrentUser(): Promise<boolean> {
  const session = await getSession()
  const user = session?.user
  if (!user) return false
  const user_settings = await _getSettings(user.id)
  return user_settings.redirectToMyWall
}
