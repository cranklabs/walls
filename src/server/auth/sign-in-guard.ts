import type { createAuthAccessPolicy } from "./access-policy"

type SignInPolicy = Pick<
  ReturnType<typeof createAuthAccessPolicy>,
  "emailAccessError"
>

const PASSWORDLESS_SIGN_IN_PATHS = new Set([
  "/sign-in/magic-link",
  "/email-otp/send-verification-otp",
  "/sign-in/email-otp",
])
const PASSWORD_SIGN_IN_PATH = "/sign-in/email"

function json(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

/**
 * Enforces blocked and invite-only rules before Better Auth handles an email
 * sign-in request. Returns a response to short-circuit the request, or
 * undefined to let it continue.
 */
export function createEmailSignInGuard(policy: SignInPolicy) {
  return async function guardEmailSignIn(
    path: string,
    body: unknown,
  ): Promise<Response | undefined> {
    const passwordless = PASSWORDLESS_SIGN_IN_PATHS.has(path)
    if (!passwordless && path !== PASSWORD_SIGN_IN_PATH) return

    const email = (body as { email?: unknown } | undefined)?.email
    if (typeof email !== "string" || !email) return

    const normalizedEmail = email.trim().toLowerCase()
    const error = await policy.emailAccessError(normalizedEmail)
    if (error === "invalid_email") {
      return json(400, { error, message: "Enter a valid email address." })
    }
    if (error === "blocked") {
      return json(403, {
        error: "blocked",
        message: "This account has been blocked.",
      })
    }

    // Password sign-in cannot create users, so an unknown email gets Better
    // Auth's normal invalid-credentials response rather than an invite prompt.
    if (!error || !passwordless) return

    return json(403, {
      error: "invite_only",
      message: "This instance is invite-only.",
      redirectTo: `/request-access?email=${encodeURIComponent(normalizedEmail)}`,
    })
  }
}
