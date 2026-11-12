"use server"

import { eq } from "drizzle-orm"

import { getSession } from "../auth"
import { db } from "../db"
import { getChildCount } from "../db/queries"
import { file } from "../db/schema"

export async function deleteFile(id: number) {
  const session = await getSession()
  if (!session) {
    return {
      status: "error" as const,
      message: "Not authenticated",
    }
  }

  const owners = await db
    .select({
      owner: file.uploadedBy,
    })
    .from(file)
    .where(eq(file.id, id))
    .limit(1)

  if (!owners[0]) return { status: "error" as const, message: "File not found" }
  if (!session.user.isAdmin && owners[0].owner !== session.user.id) {
    return {
      status: "error" as const,
      message: "Not authorized",
    }
  }

  const childCount = await getChildCount(id)
  if (childCount > 0) {
    return {
      status: "error" as const,
      message: `Cannot delete: this wallpaper has ${childCount} variant(s). Delete variants first.`,
    }
  }

  await db.delete(file).where(eq(file.id, id))

  return {
    status: "success" as const,
  }
}
