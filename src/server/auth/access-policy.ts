import type { DiscordOptions } from "better-auth/social-providers"

export type AuthUser = {
  id: string
  email: string
  blocked: boolean
}

export type AuthAccessStore = {
  findUserByEmail: (email: string) => Promise<AuthUser | undefined>
  findUserById: (id: string) => Promise<AuthUser | undefined>
  findDiscordUser: (accountId: string) => Promise<AuthUser | undefined>
  isInviteOnly: () => Promise<boolean>
  isEmailInvited: (email: string) => Promise<boolean>
}

export function createAuthAccessPolicy(store: AuthAccessStore) {
  async function emailAccessError(email: string) {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return "invalid_email" as const

    const user = await store.findUserByEmail(normalizedEmail)
    if (user?.blocked) return "blocked" as const
    if (user || !(await store.isInviteOnly())) return null
    return (await store.isEmailInvited(normalizedEmail))
      ? null
      : ("invite_only" as const)
  }

  async function mapDiscordProfile(profile: {
    id: string
    email?: string | null
    verified?: boolean
  }) {
    const email = profile.email?.trim().toLowerCase()
    const denied = { email: "", emailVerified: false }
    // An empty email makes Better Auth reject the callback before creating or
    // linking an account. Never invent emails for phone-only Discord accounts.
    if (!email || profile.verified !== true) return denied

    // Existing provider IDs are authoritative even if the Discord email changes.
    // This also checks the stored blocked flag rather than trusting a fresh email.
    const linkedUser = await store.findDiscordUser(profile.id)
    if (linkedUser) {
      return linkedUser.blocked ? denied : { email, emailVerified: true }
    }

    return (await emailAccessError(email))
      ? denied
      : { email, emailVerified: true }
  }

  async function beforeUserCreate(user: {
    email: string
    name?: string | null
  }) {
    const email = user.email.trim().toLowerCase()
    // Better Auth should have found an existing user before this hook. Refuse a
    // duplicate (including legacy mixed-case emails) rather than split ownership.
    if (await store.findUserByEmail(email)) return false as const
    if (await emailAccessError(email)) return false as const

    return {
      data: {
        email,
        name: user.name?.trim() ? user.name : (email.split("@")[0] ?? "User"),
      },
    }
  }

  async function beforeAccountCreate(account: { userId: string }) {
    const user = await store.findUserById(account.userId)
    // A just-created user may not yet be visible outside the adapter transaction.
    // Signup policy is checked before that insert, and the DB foreign key still
    // requires an owner. Known blocked users must not gain additional accounts.
    if (user?.blocked) return false as const
  }

  async function beforeSessionCreate(session: { userId: string }) {
    const user = await store.findUserById(session.userId)
    if (!user || user.blocked) return false as const
  }

  async function canReceivePasswordReset(userId: string) {
    const user = await store.findUserById(userId)
    return Boolean(user && !user.blocked)
  }

  return {
    emailAccessError,
    mapDiscordProfile,
    beforeUserCreate,
    beforeAccountCreate,
    beforeSessionCreate,
    canReceivePasswordReset,
  }
}

export function getDiscordProviderOptions(
  credentials: { clientId?: string; clientSecret?: string },
  policy: ReturnType<typeof createAuthAccessPolicy>,
): DiscordOptions | undefined {
  const clientId = credentials.clientId?.trim()
  const clientSecret = credentials.clientSecret?.trim()
  if (!clientId && !clientSecret) return undefined
  if (!clientId || !clientSecret) {
    throw new Error(
      "Configure both DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET",
    )
  }

  return {
    clientId,
    clientSecret,
    prompt: "consent",
    mapProfileToUser: policy.mapDiscordProfile,
  }
}
