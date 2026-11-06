import { getMailConfiguration } from "../src/server/mail/config.ts"
import {
  inviteMessage,
  magicLinkMessage,
  otpMessage,
} from "../src/server/mail/messages.ts"
import { createMailSender } from "../src/server/mail/transport.ts"

import { SESv2Client } from "@aws-sdk/client-sesv2"
import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"
import { emailOTP, magicLink } from "better-auth/plugins"
import assert from "node:assert/strict"
import test from "node:test"

const config = getMailConfiguration({
  EMAIL_PROVIDER: "ses",
  EMAIL_FROM: "no-reply@example.com",
  AWS_REGION: "us-east-1",
  SES_CONFIGURATION_SET: "fixture-walls",
})

function fixture() {
  const sent = []
  const send = createMailSender(config, {
    sesClient: () => ({ send: async (command) => sent.push(command.input) }),
  })
  const data = { user: [], account: [], session: [], verification: [] }
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "isolated-fixture-secret-with-at-least-32-characters",
    database: memoryAdapter(data),
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) =>
          send(magicLinkMessage(email, url)),
      }),
      emailOTP({
        sendVerificationOTP: async ({ email, otp }) =>
          send(otpMessage(email, otp)),
      }),
    ],
    logger: { disabled: true },
  })
  return { sent, auth, data, send }
}

async function post(auth, path, body) {
  return auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(body),
    }),
  )
}

test("real Better Auth magic-link flow delivers the actual template through mocked SES", async () => {
  const { sent, auth, data } = fixture()
  const response = await post(auth, "/sign-in/magic-link", {
    email: "member@example.com",
    callbackURL: "/",
  })
  assert.equal(response.status, 200)
  assert.equal(sent.length, 1)
  assert.equal(sent[0].FromEmailAddress, config.from)
  assert.deepEqual(sent[0].Destination.ToAddresses, ["member@example.com"])
  assert.equal(sent[0].Content.Simple.Subject.Data, "Sign in to Walls")
  assert.match(
    sent[0].Content.Simple.Body.Text.Data,
    /Click this link to sign in:/,
  )
  assert.match(
    sent[0].Content.Simple.Body.Html.Data,
    /http:\/\/localhost:3000\/api\/auth\/magic-link\/verify\?token=/,
  )
  assert.equal(data.session.length, 0)
  assert.equal(data.user.length, 0)
})

test("real Better Auth OTP flow delivers the existing OTP text/HTML through mocked SES", async () => {
  const { sent, auth, data } = fixture()
  const response = await post(auth, "/email-otp/send-verification-otp", {
    email: "member@example.com",
    type: "sign-in",
  })
  assert.equal(response.status, 200)
  assert.equal(sent.length, 1)
  assert.match(sent[0].Content.Simple.Body.Text.Data, /^Your OTP is \d{6}$/)
  assert.equal(
    sent[0].Content.Simple.Body.Html.Data,
    `<p>${sent[0].Content.Simple.Body.Text.Data}</p>`,
  )
  assert.equal(data.session.length, 0)
  assert.equal(data.user.length, 0)
})

test("actual invitation template keeps sender override centralized and remains text-only", async () => {
  const { sent, send } = fixture()
  await send(
    inviteMessage(
      "member@example.com",
      "Fixture Owner",
      "http://localhost:3000",
    ),
  )
  assert.equal(sent.length, 1)
  assert.equal(sent[0].FromEmailAddress, config.from)
  assert.equal(sent[0].Content.Simple.Subject.Data, "You've been invited")
  assert.match(
    sent[0].Content.Simple.Body.Text.Data,
    /Invited by: Fixture Owner/,
  )
  assert.match(
    sent[0].Content.Simple.Body.Text.Data,
    /Sign in here: http:\/\/localhost:3000\/signin/,
  )
  assert.equal(sent[0].Content.Simple.Body.Html, undefined)
})

test("official AWS SDK serializes and signs the expected SESv2 request without network access", async (t) => {
  const requests = []
  const client = new SESv2Client({
    region: "us-east-1",
    maxAttempts: 1,
    credentials: {
      accessKeyId: "fixture-access-key",
      secretAccessKey: "fixture-secret-key",
    },
    requestHandler: {
      handle: async (request) => {
        requests.push(request)
        return {
          response: {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: Buffer.from(JSON.stringify({ MessageId: "fixture-message" })),
          },
        }
      },
    },
  })
  t.after(() => client.destroy())
  const send = createMailSender(config, { sesClient: () => client })
  await send(otpMessage("member@example.com", "123456"))
  assert.equal(requests.length, 1)
  assert.equal(requests[0].method, "POST")
  assert.equal(requests[0].hostname, "email.us-east-1.amazonaws.com")
  assert.equal(requests[0].path, "/v2/email/outbound-emails")
  assert.ok(requests[0].headers.authorization.startsWith("AWS4-HMAC-SHA256 "))
  const rawBody = requests[0].body
  const body = JSON.parse(
    typeof rawBody === "string" ? rawBody : new TextDecoder().decode(rawBody),
  )
  assert.equal(body.FromEmailAddress, config.from)
  assert.equal(body.ConfigurationSetName, "fixture-walls")
  assert.equal(body.Content.Simple.Body.Text.Data, "Your OTP is 123456")
})
