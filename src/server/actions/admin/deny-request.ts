"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/server/auth"
import { deleteInviteRequest } from "@/server/db/queries"

export async function denyRequest(id: number): Promise<{
  success: boolean
  message: string
}> {
  const session = await getSession()
  if (!session?.user.isAdmin) {
    return { success: false, message: "Not authorized" }
  }

  const email = await deleteInviteRequest(id)
  if (!email) {
    return { success: false, message: "Request not found" }
  }

  revalidatePath("/settings")

  return {
    success: true,
    message: `Denied request from ${email}`,
  }
}
