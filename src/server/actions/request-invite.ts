"use server"

import { revalidatePath } from "next/cache"

import {
  createInviteRequest,
  hasExistingRequest,
  isEmailInvited,
  isExistingUser,
} from "@/server/db/queries"

export async function requestInvite(email: string): Promise<{
  success: boolean
  message: string
}> {
  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail?.includes("@")) {
    return { success: false, message: "Invalid email address" }
  }

  // Check if already has an account
  const exists = await isExistingUser(trimmedEmail)
  if (exists) {
    return { success: false, message: "This email already has an account" }
  }

  // Check if already invited
  const invited = await isEmailInvited(trimmedEmail)
  if (invited) {
    return { success: false, message: "This email has already been invited" }
  }

  // Check if already requested
  const requested = await hasExistingRequest(trimmedEmail)
  if (requested) {
    return {
      success: false,
      message: "A request for this email has already been submitted",
    }
  }

  await createInviteRequest(trimmedEmail)

  revalidatePath("/settings")

  return {
    success: true,
    message: "Your access request has been submitted",
  }
}
