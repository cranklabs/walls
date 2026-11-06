import {
  createAuthAccessPolicy,
  getDiscordProviderOptions,
} from "../src/server/auth/access-policy.ts"
import * as schema from "../src/server/db/schema.ts"

import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"
import { getAuthTables } from "better-auth/db"
import { getTableColumns } from "drizzle-orm"
import assert from "node:assert/strict"
import test from "node:test"

const baseURL = "http://localhost:3000"
const discordId = "123456789012345678"

function user(overrides = {}) {
  return {
    id: "original-owner",
    name: "Original Name",
    email: "member@example.com",
    emailVerified: true,
    blocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function account(providerId = "discord") {
  return {
    id: "original-account",
    userId: "original-owner",
    providerId,
    accountId: providerId === "discord" ? discordId : "google-fixture-id",
    accessToken: "old-fixture-token",
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function fixture(t, options = {}) {
  const data = {
    user: options.users ?? [],
    account: options.accounts ?? [],
    session: [],
    verification: [],
  }
  const invited = new Set(options.invited ?? [])
  const policy = createAuthAccessPolicy({
    findUserByEmail: async (email) =>
      data.user.find((value) => value.email.toLowerCase() === email),
    findUserById: async (id) => {
      const owner = data.user.find((value) => value.id === id)
      return owner && options.blockAtSession
        ? { ...owner, blocked: true }
        : owner
    },
    findDiscordUser: async (id) => {
      const linked = data.account.find(
        (value) => value.providerId === "discord" && value.accountId === id,
      )
      return data.user.find((value) => value.id === linked?.userId)
    },
    isInviteOnly: async () => options.inviteOnly ?? true,
    isEmailInvited: async (email) => invited.has(email),
  })
  const fetchCalls = []
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const request = new Request(input, init)
    const url = new URL(request.url)
    fetchCalls.push(request.url)
    let response
    if (request.url === "https://discord.com/api/oauth2/token") {
      const body = new URLSearchParams(await request.text())
      assert.equal(
        body.get("redirect_uri"),
        `${baseURL}/api/auth/callback/discord`,
      )
      assert.equal(body.get("client_secret"), "discord-fixture-secret")
      response = {
        access_token: "new-fixture-token",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "identify email",
      }
    } else if (
      url.origin === "https://discord.com" &&
      decodeURIComponent(url.pathname) === "/api/users/@me"
    ) {
      assert.equal(
        request.headers.get("authorization"),
        "Bearer new-fixture-token",
      )
      response = {
        id: discordId,
        username: "discord-fixture",
        global_name: "Discord Name",
        discriminator: "0",
        avatar: null,
        email: "member@example.com",
        verified: true,
        ...options.profile,
      }
    } else {
      throw new Error("Unexpected external request in isolated OAuth test")
    }
    return new Response(JSON.stringify(response), {
      headers: { "content-type": "application/json" },
    })
  })
  const auth = betterAuth({
    baseURL,
    secret: "isolated-oauth-fixture-secret-never-used-outside-tests",
    database: memoryAdapter(data),
    telemetry: { enabled: false },
    logger: { disabled: true },
    advanced: { disableCSRFCheck: false, disableOriginCheck: false },
    socialProviders: {
      discord: getDiscordProviderOptions(
        {
          clientId: "123456789012345679",
          clientSecret: "discord-fixture-secret",
        },
        policy,
      ),
    },
    onAPIError: { errorURL: `${baseURL}/signin` },
    user: {
      additionalFields: {
        blocked: { type: "boolean", defaultValue: false, input: false },
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: [],
        allowDifferentEmails: false,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: policy.beforeUserCreate,
          after: async (created) => invited.delete(created.email),
        },
      },
      account: { create: { before: policy.beforeAccountCreate } },
      session: { create: { before: policy.beforeSessionCreate } },
    },
  })
  async function begin() {
    const response = await auth.handler(
      new Request(`${baseURL}/api/auth/sign-in/social`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: baseURL },
        body: JSON.stringify({
          provider: "discord",
          callbackURL: `${baseURL}/`,
          errorCallbackURL: `${baseURL}/signin`,
        }),
      }),
    )
    assert.equal(response.status, 200)
    const { url } = await response.json()
    const authorization = new URL(url)
    assert.equal(authorization.origin, "https://discord.com")
    assert.equal(authorization.searchParams.get("prompt"), "consent")
    assert.deepEqual(
      new Set(authorization.searchParams.get("scope").split(" ")),
      new Set(["identify", "email"]),
    )
    assert.equal(
      authorization.searchParams.get("redirect_uri"),
      `${baseURL}/api/auth/callback/discord`,
    )
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ")
    return { state: authorization.searchParams.get("state"), cookie }
  }
  async function callback({ omitCookie = false, cancelled = false } = {}) {
    const { state, cookie } = await begin()
    const query = new URLSearchParams({ state })
    query.set(
      cancelled ? "error" : "code",
      cancelled ? "access_denied" : "fixture-code",
    )
    return auth.handler(
      new Request(`${baseURL}/api/auth/callback/discord?${query}`, {
        headers: omitCookie ? {} : { cookie },
      }),
    )
  }
  return { auth, data, invited, callback, fetchCalls }
}

test("existing Discord accounts retain the original user and account IDs", async (t) => {
  const f = fixture(t, { users: [user()], accounts: [account()] })
  const response = await f.callback()
  assert.equal(response.status, 302)
  assert.equal(response.headers.get("location"), `${baseURL}/`)
  assert.equal(f.data.user.length, 1)
  assert.equal(f.data.account.length, 1)
  assert.equal(f.data.user[0].id, "original-owner")
  assert.equal(f.data.account[0].id, "original-account")
  assert.equal(f.data.user[0].name, "Original Name")
  assert.equal(f.data.session[0].userId, "original-owner")
})

test("verified matching emails link Discord to an existing Google user without duplicating it", async (t) => {
  const f = fixture(t, { users: [user()], accounts: [account("google")] })
  const response = await f.callback()
  assert.equal(response.headers.get("location"), `${baseURL}/`)
  assert.equal(f.data.user.length, 1)
  assert.equal(f.data.account.length, 2)
  assert.equal(f.data.session[0].userId, "original-owner")
  assert.equal(
    f.data.account.find((value) => value.providerId === "discord").userId,
    "original-owner",
  )
})

test("returning Discord identities preserve ownership and stored email after provider changes", async (t) => {
  const f = fixture(t, {
    users: [user()],
    accounts: [account()],
    profile: { email: "changed@example.com" },
  })
  const response = await f.callback()
  assert.equal(response.headers.get("location"), `${baseURL}/`)
  assert.equal(f.data.user.length, 1)
  assert.equal(f.data.user[0].email, "member@example.com")
  assert.equal(f.data.session[0].userId, "original-owner")
})

for (const profile of [{ verified: false }, { email: null }, { email: "" }]) {
  test(`unverified or missing Discord email cannot link to an existing user: ${JSON.stringify(profile)}`, async (t) => {
    const f = fixture(t, {
      users: [user()],
      accounts: [account("google")],
      profile,
    })
    const response = await f.callback()
    assert.equal(
      new URL(response.headers.get("location")).searchParams.get("error"),
      "email_not_found",
    )
    assert.equal(f.data.user.length, 1)
    assert.equal(f.data.account.length, 1)
    assert.equal(f.data.session.length, 0)
  })
}

test("uninvited new Discord users cannot bypass invite-only admission", async (t) => {
  const f = fixture(t)
  const response = await f.callback()
  assert.equal(new URL(response.headers.get("location")).pathname, "/signin")
  assert.equal(f.data.user.length, 0)
  assert.equal(f.data.account.length, 0)
  assert.equal(f.data.session.length, 0)
})

test("invited verified Discord users are created in the existing auth models", async (t) => {
  const f = fixture(t, { invited: ["member@example.com"] })
  const response = await f.callback()
  assert.equal(response.headers.get("location"), `${baseURL}/`)
  assert.equal(f.data.user.length, 1)
  assert.equal(f.data.account[0].providerId, "discord")
  assert.equal(f.data.account[0].accountId, discordId)
  assert.equal(f.data.session[0].userId, f.data.user[0].id)
  assert.equal(f.invited.size, 0)
})

test("blocked linked users cannot bypass the stored block by changing Discord email", async (t) => {
  const f = fixture(t, {
    users: [user({ blocked: true })],
    accounts: [account()],
    profile: { email: "changed@example.com" },
    inviteOnly: false,
  })
  const response = await f.callback()
  assert.equal(new URL(response.headers.get("location")).pathname, "/signin")
  assert.equal(f.data.session.length, 0)
  assert.equal(f.data.account[0].accessToken, "old-fixture-token")
})

test("a stored block is rechecked immediately before session creation", async (t) => {
  const f = fixture(t, {
    users: [user()],
    accounts: [account()],
    blockAtSession: true,
  })
  const response = await f.callback()
  assert.equal(
    new URL(response.headers.get("location")).searchParams.get("error"),
    "unable_to_create_session",
  )
  assert.equal(f.data.session.length, 0)
})

test("missing OAuth state cookies fail closed before token exchange", async (t) => {
  const f = fixture(t, { users: [user()], accounts: [account()] })
  const response = await f.callback({ omitCookie: true })
  assert.equal(new URL(response.headers.get("location")).pathname, "/signin")
  assert.equal(f.fetchCalls.length, 0)
  assert.equal(f.data.session.length, 0)
})

test("cancelled consent returns a safe sign-in error without a session", async (t) => {
  const f = fixture(t)
  const response = await f.callback({ cancelled: true })
  assert.equal(
    new URL(response.headers.get("location")).searchParams.get("error"),
    "access_denied",
  )
  assert.equal(f.fetchCalls.length, 0)
  assert.equal(f.data.session.length, 0)
})

test("untrusted OAuth return URLs are rejected rather than creating an open redirect", async (t) => {
  const f = fixture(t)
  const response = await f.auth.handler(
    new Request(`${baseURL}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseURL },
      body: JSON.stringify({
        provider: "discord",
        callbackURL: "https://untrusted.invalid/",
      }),
    }),
  )
  assert.equal(response.status, 403)
  assert.equal(f.fetchCalls.length, 0)
  assert.equal(f.data.session.length, 0)
})

test("existing Drizzle auth tables contain Better Auth's Discord-required columns", () => {
  const tables = getAuthTables({})
  const models = {
    user: schema.users,
    session: schema.sessions,
    account: schema.accounts,
    verification: schema.verification,
  }
  for (const [model, table] of Object.entries(models)) {
    const columns = getTableColumns(table)
    for (const field of ["id", ...Object.keys(tables[model].fields)]) {
      assert.ok(
        columns[field],
        `${model}.${field} must exist without recreating auth tables`,
      )
    }
  }
  const verificationColumns = getTableColumns(schema.verification)
  assert.equal(verificationColumns.identifier.getSQLType(), "text")
  assert.equal(verificationColumns.value.getSQLType(), "text")
})
