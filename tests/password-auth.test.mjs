import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import test from "node:test"
import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"
import { createAuthMiddleware } from "better-auth/api"
import { emailOTP } from "better-auth/plugins"

import { createAuthAccessPolicy } from "../src/server/auth/access-policy.ts"
import {
  getEmailAndPasswordOptions,
  RESET_PASSWORD_TOKEN_TTL_SECONDS,
} from "../src/server/auth/password.ts"
import { createEmailSignInGuard } from "../src/server/auth/sign-in-guard.ts"
import { resetPasswordMessage } from "../src/server/mail/messages.ts"

const baseURL = "http://localhost:3000"
const secret = "isolated-password-fixture-secret-never-used-outside-tests"
const password = "correct horse battery"

function member(overrides = {}) {
  return {
    id: "member-id",
    name: "Member",
    email: "member@example.com",
    emailVerified: true,
    blocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function fixture({ users = [member()], inviteOnly = true } = {}) {
  const data = { user: users, account: [], session: [], verification: [] }
  const sent = []
  const policy = createAuthAccessPolicy({
    findUserByEmail: async (email) =>
      data.user.find((value) => value.email.toLowerCase() === email),
    findUserById: async (id) => data.user.find((value) => value.id === id),
    findDiscordUser: async () => undefined,
    isInviteOnly: async () => inviteOnly,
    isEmailInvited: async () => false,
  })
  const guard = createEmailSignInGuard(policy)
  const options = getEmailAndPasswordOptions(policy, async (email, url) => {
    sent.push(resetPasswordMessage(email, url))
  })
  const auth = betterAuth({
    baseURL,
    secret,
    database: memoryAdapter(data),
    telemetry: { enabled: false },
    logger: { disabled: true },
    emailAndPassword: options,
    plugins: [emailOTP({ sendVerificationOTP: async () => {} })],
    databaseHooks: {
      user: { create: { before: policy.beforeUserCreate } },
      session: { create: { before: policy.beforeSessionCreate } },
      account: { create: { before: policy.beforeAccountCreate } },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => guard(ctx.path, ctx.body)),
    },
  })
  return { auth, data, sent, options, guard }
}

async function request(auth, method, path, body, cookie) {
  const headers = { origin: baseURL }
  if (body) headers["content-type"] = "application/json"
  if (cookie) headers.cookie = cookie
  const response = await auth.handler(
    new Request(`${baseURL}/api/auth${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    }),
  )
  const text = await response.text()
  return { response, json: text ? JSON.parse(text) : null }
}

async function signedInCookie(auth, userId) {
  const context = await auth.$context
  const session = await context.internalAdapter.createSession(userId)
  const signature = createHmac("sha256", secret)
    .update(session.token)
    .digest("base64")
  return `better-auth.session_token=${encodeURIComponent(`${session.token}.${signature}`)}`
}

async function addPassword(auth, cookie, newPassword = password) {
  return auth.api.setPassword({
    body: { newPassword },
    headers: new Headers({ cookie }),
  })
}

function tokenOf(cookie) {
  return decodeURIComponent(cookie.split("=")[1]).split(".")[0]
}

function credentials(data) {
  return data.account.filter((value) => value.providerId === "credential")
}

test("password options keep sign-up disabled and reset links short-lived", () => {
  const { options } = fixture()
  assert.equal(options.enabled, true)
  assert.equal(options.disableSignUp, true)
  assert.equal(options.minPasswordLength, 8)
  assert.equal(options.maxPasswordLength, 128)
  assert.equal(options.revokeSessionsOnPasswordReset, true)
  assert.equal(options.resetPasswordTokenExpiresIn, 3600)
  assert.equal(RESET_PASSWORD_TOKEN_TTL_SECONDS, 3600)
})

test("email+password sign-up stays disabled even when the instance is open", async () => {
  const { auth, data } = fixture({ users: [], inviteOnly: false })
  const { response, json } = await request(auth, "POST", "/sign-up/email", {
    name: "New",
    email: "new@example.com",
    password,
  })
  assert.equal(response.status, 400)
  assert.equal(json.code, "EMAIL_PASSWORD_SIGN_UP_DISABLED")
  assert.equal(data.user.length, 0)
  assert.equal(data.account.length, 0)
})

test("a signed-in member adds a password, stored only as a hash, then signs in with it", async () => {
  const { auth, data } = fixture()
  const cookie = await signedInCookie(auth, "member-id")
  await addPassword(auth, cookie)

  const [credential] = credentials(data)
  assert.equal(credential.userId, "member-id")
  assert.ok(credential.password)
  assert.notEqual(credential.password, password)
  assert.ok(!credential.password.includes(password))

  const ok = await request(auth, "POST", "/sign-in/email", {
    email: "MEMBER@example.com",
    password,
  })
  assert.equal(ok.response.status, 200)
  assert.equal(ok.json.user.id, "member-id")
  assert.match(
    ok.response.headers.get("set-cookie"),
    /better-auth\.session_token=/,
  )
})

test("wrong passwords, unknown emails and members without a password get the same generic error", async () => {
  const { auth, data } = fixture({
    users: [member(), member({ id: "no-pw", email: "nopw@example.com" })],
  })
  await addPassword(auth, await signedInCookie(auth, "member-id"))
  const sessions = data.session.length

  for (const body of [
    { email: "member@example.com", password: "wrong password!" },
    { email: "unknown@example.com", password },
    { email: "nopw@example.com", password },
  ]) {
    const { response, json } = await request(
      auth,
      "POST",
      "/sign-in/email",
      body,
    )
    assert.equal(response.status, 401, body.email)
    assert.equal(json.code, "INVALID_EMAIL_OR_PASSWORD")
  }
  // Password sign-in never redirects unknown emails to request access.
  assert.equal(data.session.length, sessions)
  assert.equal(data.user.length, 2)
})

test("an existing password cannot be overwritten without the current one", async () => {
  const { auth, data } = fixture()
  const cookie = await signedInCookie(auth, "member-id")
  await addPassword(auth, cookie)
  await assert.rejects(
    addPassword(auth, cookie, "another password"),
    (error) => error.body?.code === "PASSWORD_ALREADY_SET",
  )

  const wrong = await request(
    auth,
    "POST",
    "/change-password",
    { currentPassword: "not my password", newPassword: "brand new password" },
    cookie,
  )
  assert.equal(wrong.response.status, 400)
  assert.equal(wrong.json.code, "INVALID_PASSWORD")

  const other = await signedInCookie(auth, "member-id")
  const changed = await request(
    auth,
    "POST",
    "/change-password",
    {
      currentPassword: password,
      newPassword: "brand new password",
      revokeOtherSessions: true,
    },
    cookie,
  )
  assert.equal(changed.response.status, 200)
  assert.ok(!data.session.some((value) => value.token === tokenOf(other)))
  assert.equal(
    (
      await request(auth, "POST", "/sign-in/email", {
        email: "member@example.com",
        password,
      })
    ).response.status,
    401,
  )
  assert.equal(
    (
      await request(auth, "POST", "/sign-in/email", {
        email: "member@example.com",
        password: "brand new password",
      })
    ).response.status,
    200,
  )
})

test("passwords outside 8–128 characters are rejected", async () => {
  const { auth, data } = fixture()
  const cookie = await signedInCookie(auth, "member-id")
  await assert.rejects(
    addPassword(auth, cookie, "short"),
    (error) => error.body?.code === "PASSWORD_TOO_SHORT",
  )
  await assert.rejects(
    addPassword(auth, cookie, "x".repeat(129)),
    (error) => error.body?.code === "PASSWORD_TOO_LONG",
  )
  assert.equal(credentials(data).length, 0)
})

test("a reset link uses the real template, sets a first password, is single-use and signs out everywhere", async () => {
  const { auth, data, sent } = fixture()
  await signedInCookie(auth, "member-id")
  assert.equal(data.session.length, 1)

  const requested = await request(auth, "POST", "/request-password-reset", {
    email: "member@example.com",
    redirectTo: "/signin/reset-password",
  })
  assert.equal(requested.response.status, 200)
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, "member@example.com")
  assert.equal(sent[0].subject, "Reset your Walls password")
  const link = sent[0].text.match(/http\S+/)[0]
  assert.match(
    link,
    /^http:\/\/localhost:3000\/api\/auth\/reset-password\/\w+\?callbackURL=%2Fsignin%2Freset-password$/,
  )
  assert.match(
    sent[0].html,
    new RegExp(`href="${link.replace(/[?]/g, "\\?")}"`),
  )

  const callback = await auth.handler(new Request(link, { redirect: "manual" }))
  assert.equal(callback.status, 302)
  const location = new URL(callback.headers.get("location"), baseURL)
  assert.equal(location.pathname, "/signin/reset-password")
  const token = location.searchParams.get("token")
  assert.ok(token)

  const reset = await request(auth, "POST", "/reset-password", {
    token,
    newPassword: "reset password value",
  })
  assert.equal(reset.response.status, 200)
  assert.equal(credentials(data).length, 1)
  assert.equal(data.session.length, 0)

  const reused = await request(auth, "POST", "/reset-password", {
    token,
    newPassword: "another reset value",
  })
  assert.equal(reused.response.status, 400)
  assert.equal(reused.json.code, "INVALID_TOKEN")

  const signIn = await request(auth, "POST", "/sign-in/email", {
    email: "member@example.com",
    password: "reset password value",
  })
  assert.equal(signIn.response.status, 200)
})

test("an expired or unknown reset token is refused", async () => {
  const { auth, data, sent } = fixture()
  await request(auth, "POST", "/request-password-reset", {
    email: "member@example.com",
    redirectTo: "/signin/reset-password",
  })
  const token = sent[0].text.match(/reset-password\/(\w+)/)[1]
  for (const value of data.verification) value.expiresAt = new Date(0)

  const expired = await request(auth, "POST", "/reset-password", {
    token,
    newPassword: "reset password value",
  })
  assert.equal(expired.json.code, "INVALID_TOKEN")
  const unknown = await request(auth, "POST", "/reset-password", {
    token: "not-a-real-token",
    newPassword: "reset password value",
  })
  assert.equal(unknown.json.code, "INVALID_TOKEN")
  assert.equal(credentials(data).length, 0)
})

test("unknown and blocked emails get the same generic reset response and no email", async () => {
  const { auth, sent } = fixture({
    users: [member({ blocked: true })],
  })
  const responses = []
  for (const email of ["member@example.com", "unknown@example.com"]) {
    const { response, json } = await request(
      auth,
      "POST",
      "/request-password-reset",
      { email, redirectTo: "/signin/reset-password" },
    )
    assert.equal(response.status, 200)
    responses.push(json)
  }
  assert.deepEqual(responses[0], responses[1])
  assert.equal(sent.length, 0)
})

test("blocked members cannot sign in even with the correct password", async () => {
  const { auth, data } = fixture()
  await addPassword(auth, await signedInCookie(auth, "member-id"))
  data.user[0].blocked = true
  data.session.length = 0

  const { response, json } = await request(auth, "POST", "/sign-in/email", {
    email: "member@example.com",
    password,
  })
  assert.equal(response.status, 403)
  assert.equal(json.error, "blocked")
  assert.equal(data.session.length, 0)
})

test("passwordless sign-in still redirects uninvited emails to request access", async () => {
  const { auth, data } = fixture()
  const { response, json } = await request(
    auth,
    "POST",
    "/email-otp/send-verification-otp",
    { email: "Stranger@example.com", type: "sign-in" },
  )
  assert.equal(response.status, 403)
  assert.equal(json.error, "invite_only")
  assert.equal(json.redirectTo, "/request-access?email=stranger%40example.com")
  assert.equal(data.verification.length, 0)
})
