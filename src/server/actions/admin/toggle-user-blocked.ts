"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getSession } from "@/server/auth"
import { db } from "@/server/db"
import { deleteUserSessions } from "@/server/db/queries"
import { users } from "@/server/db/schema"

export async function toggleUserBlocked(userId: string): Promise<{
  success: boolean
  message: string
}> {
  const session = await getSession()
  if (!session?.user.isAdmin) {
    return { success: false, message: "Not authorized" }
  }

  if (userId === session.user.id) {
    return { success: false, message: "You cannot block yourself" }
  }

  const user = (
    await db
      .select({ blocked: users.blocked, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  )[0]

  if (!user) {
    return { success: false, message: "User not found" }
  }

  const newValue = !user.blocked
  await db.update(users).set({ blocked: newValue }).where(eq(users.id, userId))

  // If blocking, immediately invalidate all their sessions
  if (newValue) {
    await deleteUserSessions(userId)
  }

  revalidatePath("/settings")

  return {
    success: true,
    message: `${user.name ?? "User"} has been ${newValue ? "blocked" : "unblocked"}`,
  }
}
