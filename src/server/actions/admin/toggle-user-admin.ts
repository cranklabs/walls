"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getSession } from "@/server/auth"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"

export async function toggleUserAdmin(userId: string): Promise<{
  success: boolean
  message: string
}> {
  const session = await getSession()
  if (!session?.user.isAdmin) {
    return { success: false, message: "Not authorized" }
  }

  if (userId === session.user.id) {
    return {
      success: false,
      message: "You cannot change your own admin status",
    }
  }

  const user = (
    await db
      .select({ isAdmin: users.isAdmin, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  )[0]

  if (!user) {
    return { success: false, message: "User not found" }
  }

  const newValue = !user.isAdmin
  await db.update(users).set({ isAdmin: newValue }).where(eq(users.id, userId))

  revalidatePath("/settings")

  return {
    success: true,
    message: `${user.name ?? "User"} is ${newValue ? "now an admin" : "no longer an admin"}`,
  }
}
