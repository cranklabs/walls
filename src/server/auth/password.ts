import type { BetterAuthOptions } from "better-auth"

import type { createAuthAccessPolicy } from "./access-policy"

export const RESET_PASSWORD_TOKEN_TTL_SECONDS = 60 * 60

type PasswordPolicy = Pick<
  ReturnType<typeof createAuthAccessPolicy>,
  "canReceivePasswordReset"
>

/**
 * Password sign-in for existing members only: sign-up stays disabled, so a
 * password is added from Settings or through an emailed reset link.
 */
export function getEmailAndPasswordOptions(
  policy: PasswordPolicy,
  sendResetPasswordEmail: (email: string, url: string) => Promise<void>,
): NonNullable<BetterAuthOptions["emailAndPassword"]> {
  return {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: RESET_PASSWORD_TOKEN_TTL_SECONDS,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      if (!(await policy.canReceivePasswordReset(user.id))) return
      await sendResetPasswordEmail(user.email, url)
    },
  }
}
