"use server"

import { APIError } from "better-auth/api"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { auth, getSession } from "../auth"

const ERROR_MESSAGES: Record<string, string> = {
  SESSION_NOT_FRESH:
    "For your security, sign out and sign in again before adding a password.",
  PASSWORD_ALREADY_SET:
    "You already have a password. Use Change password instead.",
  PASSWORD_TOO_SHORT: "Use at least 8 characters.",
  PASSWORD_TOO_LONG: "Use at most 128 characters.",
}

export async function setPassword(
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  const user = (await getSession())?.user
  if (!user) return { success: false, message: "Not authenticated" }

  try {
    await auth.api.setPassword({
      body: { newPassword },
      headers: await headers(),
    })
  } catch (error) {
    if (error instanceof APIError) {
      const code = (error.body as { code?: string } | undefined)?.code
      return {
        success: false,
        message:
          (code && ERROR_MESSAGES[code]) ??
          error.message ??
          "Could not set your password. Please try again.",
      }
    }
    throw error
  }

  revalidatePath("/settings")
  return {
    success: true,
    message: "Password added. You can now sign in with it.",
  }
}
