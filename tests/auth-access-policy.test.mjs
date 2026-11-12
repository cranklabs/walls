import assert from "node:assert/strict"
import test from "node:test"

import {
  createAuthAccessPolicy,
  getDiscordProviderOptions,
} from "../src/server/auth/access-policy.ts"

function fixture({
  users = [],
  linked = {},
  invited = [],
  inviteOnly = true,
} = {}) {
  const store = {
    findUserByEmail: async (email) =>
      users.find((user) => user.email.toLowerCase() === email),
    findUserById: async (id) => users.find((user) => user.id === id),
    findDiscordUser: async (id) => linked[id],
    isInviteOnly: async () => inviteOnly,
    isEmailInvited: async (email) => invited.includes(email),
  }
  return createAuthAccessPolicy(store)
}

const member = {
  id: "existing-user",
  email: "member@example.com",
  blocked: false,
}
const verified = {
  id: "123456789012345678",
  email: "member@example.com",
  verified: true,
}
const denied = { email: "", emailVerified: false }

test("Discord remains disabled without credentials and rejects partial configuration", () => {
  const policy = fixture()
  assert.equal(getDiscordProviderOptions({}, policy), undefined)
  for (const credentials of [
    { clientId: "fixture-id" },
    { clientSecret: "fixture-secret" },
  ]) {
    assert.throws(
      () => getDiscordProviderOptions(credentials, policy),
      /Configure both DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET/,
    )
  }
  const options = getDiscordProviderOptions(
    { clientId: "fixture-id", clientSecret: "fixture-secret" },
    policy,
  )
  assert.equal(options.prompt, "consent")
  assert.equal(options.mapProfileToUser, policy.mapDiscordProfile)
})

test("unverified, missing and phone-only Discord emails are denied before account lookup", async () => {
  const policy = fixture({ users: [member] })
  for (const profile of [
    { ...verified, verified: false },
    { ...verified, verified: undefined },
    { ...verified, email: null },
    { ...verified, email: undefined },
    { ...verified, email: " " },
  ]) {
    assert.deepEqual(await policy.mapDiscordProfile(profile), denied)
  }
})

test("verified same-email members are admitted without another invitation", async () => {
  const policy = fixture({ users: [member] })
  assert.deepEqual(
    await policy.mapDiscordProfile({
      ...verified,
      email: " MEMBER@EXAMPLE.COM ",
    }),
    { email: member.email, emailVerified: true },
  )
})

test("invite-only new Discord users need an invitation", async () => {
  assert.deepEqual(await fixture().mapDiscordProfile(verified), denied)
  assert.deepEqual(
    await fixture({ invited: [member.email] }).mapDiscordProfile(verified),
    { email: member.email, emailVerified: true },
  )
  assert.deepEqual(
    await fixture({ inviteOnly: false }).mapDiscordProfile(verified),
    { email: member.email, emailVerified: true },
  )
})

test("blocked same-email users cannot gain a Discord account", async () => {
  const policy = fixture({
    users: [{ ...member, blocked: true }],
    invited: [member.email],
    inviteOnly: false,
  })
  assert.deepEqual(await policy.mapDiscordProfile(verified), denied)
  assert.equal(await policy.beforeAccountCreate({ userId: member.id }), false)
  assert.equal(await policy.beforeSessionCreate({ userId: member.id }), false)
})

test("stored Discord identities remain authoritative after provider email changes", async () => {
  const policy = fixture({ linked: { [verified.id]: member } })
  assert.deepEqual(
    await policy.mapDiscordProfile({
      ...verified,
      email: "changed@example.com",
    }),
    { email: "changed@example.com", emailVerified: true },
  )
  const blocked = fixture({
    linked: { [verified.id]: { ...member, blocked: true } },
    inviteOnly: false,
  })
  assert.deepEqual(
    await blocked.mapDiscordProfile({
      ...verified,
      email: "changed@example.com",
    }),
    denied,
  )
})

test("creation hooks enforce admission for all signup methods and preserve names", async () => {
  assert.equal(
    await fixture().beforeUserCreate({ email: member.email, name: "" }),
    false,
  )
  const policy = fixture({ invited: [member.email] })
  assert.deepEqual(
    await policy.beforeUserCreate({ email: " MEMBER@EXAMPLE.COM ", name: "" }),
    { data: { email: member.email, name: "member" } },
  )
  assert.deepEqual(
    await policy.beforeUserCreate({
      email: member.email,
      name: "Existing Name",
    }),
    { data: { email: member.email, name: "Existing Name" } },
  )
})

test("creation refuses duplicate legacy mixed-case identities", async () => {
  const policy = fixture({
    users: [{ ...member, email: "Member@Example.com" }],
  })
  assert.equal(await policy.beforeUserCreate({ email: member.email }), false)
})

test("session creation fails closed for missing or newly blocked owners", async () => {
  const policy = fixture({ users: [member] })
  assert.equal(await policy.beforeSessionCreate({ userId: "missing" }), false)
  assert.equal(
    await policy.beforeSessionCreate({ userId: member.id }),
    undefined,
  )
  member.blocked = true
  assert.equal(await policy.beforeSessionCreate({ userId: member.id }), false)
  member.blocked = false
})

test("uncommitted signup owners do not break account creation inside adapter transactions", async () => {
  assert.equal(
    await fixture().beforeAccountCreate({ userId: "new-transaction-owner" }),
    undefined,
  )
})
