import { env } from "@/env"
import { sendEmail } from "@/server/email"
import { inviteMessage } from "@/server/mail/messages"

export async function sendInviteEmail(
  email: string,
  inviterName: string,
): Promise<{ success: boolean }> {
  try {
    await sendEmail(inviteMessage(email, inviterName, env.APP_URL))
    return { success: true }
  } catch {
    console.error("Failed to send invite email")
    return { success: false }
  }
}
