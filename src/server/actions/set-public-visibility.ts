"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getSession } from "../auth"
import { db } from "../db"
import { file } from "../db/schema"

export async function setPublicVisibility({
  id,
  publicVisibility,
}: {
  id: number
  publicVisibility: boolean
}) {
  const session = await getSession()
  if (!session)
    return {
      status: "error" as const,
      message: "Not authenticated",
    }

  const ownerId = (
    await db
      .select({ ownerId: file.uploadedBy })
      .from(file)
      .where(eq(file.id, id))
  )[0]

  if (!ownerId) {
    return {
      status: "error" as const,
      message: "Image not found",
    }
  }

  if (!session.user.isAdmin && ownerId.ownerId !== session.user.id) {
    return {
      status: "error" as const,
      message: "You do not own this image",
    }
  }

  const changed = await db
    .update(file)
    .set({
      publicVisibility: publicVisibility,
    })
    .where(eq(file.id, id))
    .returning({ id: file.id })

  if (!changed[0]) {
    return {
      status: "error" as const,
      message: "Image not found",
    }
  }

  revalidatePath(`/walls/${id}`)

  const newVisibility = publicVisibility ? "PUBLIC" : "PRIVATE"

  return {
    status: "success" as const,
    message: `Visibility set to ${newVisibility}`,
  }
}
