"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getSession } from "../auth"
import { db } from "../db"
import { settings } from "../db/schema"
import { _getSettings } from "../settings"

export async function setSelfAbsorbedMode(
  selfAbsorbedMode: boolean,
): Promise<{ success: boolean; message: string }> {
  const user = (await getSession())?.user
  if (!user) return { success: false, message: "Not authenticated" }

  const redirectToMyWall = selfAbsorbedMode ? true : false

  const user_settings = await _getSettings(user.id)
  if (user_settings.redirectToMyWall === redirectToMyWall)
    return { success: true, message: "No change" }

  await db
    .update(settings)
    .set({ redirectToMyWall })
    .where(eq(settings.userId, user.id))

  revalidatePath("/settings")

  return {
    success: true,
    message: `Turned ${selfAbsorbedMode ? "on" : "off"} self absorbed mode`,
  }
}
