"use server"

import { revalidatePath } from "next/cache"

import { getSession } from "@/server/auth"
import {
  addInviteEmail,
  isEmailInvited,
  isExistingUser,
} from "@/server/db/queries"
import { sendInviteEmail } from "@/server/mail"

export async function addInvite(email: string): Promise<{
  success: boolean
  message: string
}> {
  const session = await getSession()
  if (!session?.user.isAdmin) {
    return { success: false, message: "Not authorized" }
  }

  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail?.includes("@")) {
    return { success: false, message: "Invalid email address" }
  }

  // Check if this email already has an account
  const exists = await isExistingUser(trimmedEmail)
  if (exists) {
    return { success: false, message: "This email already has an account" }
  }

  // Check if already invited
  const alreadyInvited = await isEmailInvited(trimmedEmail)
  if (alreadyInvited) {
    return { success: false, message: "This email is already invited" }
  }

  await addInviteEmail(trimmedEmail, session.user.id)

  const inviterName = session.user.name ?? "An administrator"
  const emailResult = await sendInviteEmail(trimmedEmail, inviterName)

  revalidatePath("/settings")

  return {
    success: true,
    message: emailResult.success
      ? `Invited ${trimmedEmail}`
      : `Invited ${trimmedEmail} (email notification failed)`,
  }
}
