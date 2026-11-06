import { env } from "@/env"
import { db } from "@/server/db"
import { deleteInviteByEmail, updateLastSeen } from "@/server/db/queries"
import * as schema from "@/server/db/schema"
import { sendEmail } from "@/server/email"
import { magicLinkMessage, otpMessage } from "@/server/mail/messages"

import {
  createAuthAccessPolicy,
  getDiscordProviderOptions,
} from "./access-policy"
import { authAccessStore } from "./access-store"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createAuthMiddleware } from "better-auth/api"
import { emailOTP, magicLink } from "better-auth/plugins"

const accessPolicy = createAuthAccessPolicy(authAccessStore)
const discord = getDiscordProviderOptions(
  {
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
  },
  accessPolicy,
)
export const isDiscordEnabled = Boolean(discord)

async function enforceEmailSignInAccess(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const error = await accessPolicy.emailAccessError(normalizedEmail)
  if (error === "invalid_email") {
    return new Response(
      JSON.stringify({ error, message: "Enter a valid email address." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }
  if (error === "blocked") {
    return new Response(
      JSON.stringify({
        error: "blocked",
        message: "This account has been blocked.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    )
  }

  if (!error) return

  return new Response(
    JSON.stringify({
      error: "invite_only",
      message: "This instance is invite-only.",
      redirectTo: `/request-access?email=${encodeURIComponent(normalizedEmail)}`,
    }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    },
  )
}

export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,
  socialProviders: discord ? { discord } : {},
  onAPIError: { errorURL: `${env.APP_URL}/signin` },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verification,
    },
  }),
  user: {
    modelName: "user",
    additionalFields: {
      isAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      blocked: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      joinedAt: {
        type: "date",
        required: false,
        input: false,
      },
      lastSeen: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  session: {
    modelName: "session",
  },
  account: {
    modelName: "account",
    accountLinking: {
      enabled: true,
      trustedProviders: [],
      allowDifferentEmails: false,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail(magicLinkMessage(email, url))
      },
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        await sendEmail(otpMessage(email, otp))
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: accessPolicy.beforeUserCreate,
        after: async (user) => {
          // When a new user is created via sign-up, remove them from the invite list
          if (user.email) {
            await deleteInviteByEmail(user.email)
          }
        },
      },
    },
    session: {
      create: {
        before: accessPolicy.beforeSessionCreate,
        after: async (session) => {
          // Update lastSeen on session creation
          void updateLastSeen(session.userId)
        },
      },
    },
    account: {
      create: {
        before: accessPolicy.beforeAccountCreate,
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const protectedEmailSignInPaths = new Set([
        "/sign-in/magic-link",
        "/email-otp/send-verification-otp",
        "/sign-in/email-otp",
      ])

      // Intercept passwordless sign-in to enforce blocked/invite-only checks.
      if (protectedEmailSignInPaths.has(ctx.path)) {
        const body = ctx.body as { email?: string } | undefined
        const email = body?.email
        if (!email) return

        return await enforceEmailSignInAccess(email)
      }
    }),
  },
})

export type Session = typeof auth.$Infer.Session
