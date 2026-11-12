"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/server/auth"
import { getAppSetting, setAppSetting } from "@/server/db/queries"

export async function toggleInviteOnly(): Promise<{
  success: boolean
  message: string
}> {
  const session = await getSession()
  if (!session?.user.isAdmin) {
    return { success: false, message: "Not authorized" }
  }

  const current = (await getAppSetting("invite_only")) === "true"
  const newValue = !current

  await setAppSetting("invite_only", String(newValue))

  revalidatePath("/settings")

  return {
    success: true,
    message: `Invite-only mode ${newValue ? "enabled" : "disabled"}`,
  }
}
