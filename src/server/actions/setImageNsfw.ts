"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getSession } from "../auth"
import { db } from "../db"
import { file } from "../db/schema"

export async function setImageNsfw({ id, nsfw }: { id: number; nsfw: number }) {
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
      nsfw: nsfw,
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

  const nsfwText = nsfw === 0 ? "NONE" : nsfw === 1 ? "MILD" : "EXTREME"

  return {
    status: "success" as const,
    message: `Updated NSFW (${nsfwText})`,
  }
}
