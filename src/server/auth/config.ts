import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createAuthMiddleware } from "better-auth/api"
import { emailOTP, magicLink } from "better-auth/plugins"

import { env } from "@/env"
import { db } from "@/server/db"
import { deleteInviteByEmail, updateLastSeen } from "@/server/db/queries"
import * as schema from "@/server/db/schema"
import { sendEmail } from "@/server/email"
import {
  magicLinkMessage,
  otpMessage,
  resetPasswordMessage,
} from "@/server/mail/messages"

import {
  createAuthAccessPolicy,
  getDiscordProviderOptions,
} from "./access-policy"
import { authAccessStore } from "./access-store"
import { getEmailAndPasswordOptions } from "./password"
import { createEmailSignInGuard } from "./sign-in-guard"

const accessPolicy = createAuthAccessPolicy(authAccessStore)
const discord = getDiscordProviderOptions(
  {
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
  },
  accessPolicy,
)
export const isDiscordEnabled = Boolean(discord)
const guardEmailSignIn = createEmailSignInGuard(accessPolicy)

export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,
  socialProviders: discord ? { discord } : {},
  emailAndPassword: getEmailAndPasswordOptions(accessPolicy, (email, url) =>
    sendEmail(resetPasswordMessage(email, url)),
  ),
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
    // Enforce blocked/invite-only rules before email and password sign-in.
    before: createAuthMiddleware(async (ctx) =>
      guardEmailSignIn(ctx.path, ctx.body),
    ),
  },
})

export type Session = typeof auth.$Infer.Session
