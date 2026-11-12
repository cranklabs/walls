"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/server/auth"
import { addInviteEmail, deleteInviteRequest } from "@/server/db/queries"
import { sendInviteEmail } from "@/server/mail"

export async function approveRequest(id: number): Promise<{
  success: boolean
  message: string
}> {
  const session = await getSession()
  if (!session?.user.isAdmin) {
    return { success: false, message: "Not authorized" }
  }

  // deleteInviteRequest returns the email of the deleted request
  const email = await deleteInviteRequest(id)
  if (!email) {
    return { success: false, message: "Request not found" }
  }

  // Add to the invite list with the approving admin as the inviter
  await addInviteEmail(email, session.user.id)

  const inviterName = session.user.name ?? "An administrator"
  const emailResult = await sendInviteEmail(email, inviterName)

  revalidatePath("/settings")

  return {
    success: true,
    message: emailResult.success
      ? `Approved and invited ${email}`
      : `Approved and invited ${email} (email notification failed)`,
  }
}
