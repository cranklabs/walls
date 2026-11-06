import type { EmailMessage } from "./transport"

export function magicLinkMessage(email: string, url: string): EmailMessage {
  return {
    to: email,
    subject: "Sign in to Walls",
    text: `Click this link to sign in:\n\n${url}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>Click <a href="${url}">here</a> to sign in to Walls.</p><p>If you didn't request this, you can ignore this email.</p>`,
  }
}

export function otpMessage(email: string, otp: string): EmailMessage {
  return {
    to: email,
    subject: "Sign in to Walls",
    text: `Your OTP is ${otp}`,
    html: `<p>Your OTP is ${otp}</p>`,
  }
}

export function inviteMessage(
  email: string,
  inviterName: string,
  appUrl?: string,
): EmailMessage {
  const lines = [
    "You've been invited to join a Walls instance — a place to share and discover wallpapers.",
    "",
    `Invited by: ${inviterName}`,
  ]
  if (appUrl) lines.push(`Sign in here: ${appUrl}/signin`)
  lines.push(
    "",
    "If you didn't expect this invitation, you can ignore this email.",
  )
  return { to: email, subject: "You've been invited", text: lines.join("\n") }
}
