"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/server/auth"
import { removeInviteById } from "@/server/db/queries"

export async function removeInvite(id: number): Promise<{
  success: boolean
  message: string
}> {
  const session = await getSession()
  if (!session?.user.isAdmin) {
    return { success: false, message: "Not authorized" }
  }

  await removeInviteById(id)

  revalidatePath("/settings")

  return {
    success: true,
    message: "Invite removed",
  }
}
