import { getMailConfiguration } from "../src/server/mail/config.ts"
import { createMailSender } from "../src/server/mail/transport.ts"

import { SendEmailCommand } from "@aws-sdk/client-sesv2"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const smtp = {
  SMTP_HOST: "smtp.example.invalid",
  SMTP_USERNAME: "fixture-user",
  SMTP_PASSWORD: "fixture-secret",
  SMTP_MAIL_FROM: "legacy@example.com",
}
const ses = {
  EMAIL_PROVIDER: "ses",
  EMAIL_FROM: "no-reply@example.com",
  AWS_REGION: "us-east-1",
  SES_CONFIGURATION_SET: "fixture-walls",
}
const message = {
  to: "member@example.com",
  subject: "Sign in to Walls — ✓",
  text: "Fixture OTP 123456",
  html: "<p>Fixture OTP 123456</p>",
}

test("SMTP stays the default and preserves existing sender/credential configuration", async () => {
  const config = getMailConfiguration(smtp)
  assert.deepEqual(config, {
    provider: "smtp",
    from: smtp.SMTP_MAIL_FROM,
    host: smtp.SMTP_HOST,
    port: 587,
    username: smtp.SMTP_USERNAME,
    password: smtp.SMTP_PASSWORD,
  })
  const calls = []
  const send = createMailSender(config, {
    smtpTransport: (options) => {
      calls.push(options)
      return { sendMail: async (value) => calls.push(value) }
    },
    sesClient: () => assert.fail("SMTP must not construct an AWS client"),
  })
  await send(message)
  assert.deepEqual(calls, [
    {
      host: smtp.SMTP_HOST,
      port: 587,
      secure: false,
      auth: { user: smtp.SMTP_USERNAME, pass: smtp.SMTP_PASSWORD },
    },
    { ...message, from: smtp.SMTP_MAIL_FROM },
  ])
})

test("new From overrides legacy SMTP_MAIL_FROM and SMTP 465 enables implicit TLS", () => {
  const config = getMailConfiguration({
    ...smtp,
    EMAIL_FROM: "new@example.com",
    SMTP_PORT: "465",
  })
  assert.equal(config.from, "new@example.com")
  createMailSender(config, {
    smtpTransport: (options) => {
      assert.equal(options.secure, true)
      return { sendMail: async () => {} }
    },
  })
})

test("SES needs no SMTP settings and creates an exact UTF-8 SESv2 simple email command", async () => {
  const config = getMailConfiguration(ses)
  const calls = []
  const send = createMailSender(config, {
    smtpTransport: () => assert.fail("SES must not create an SMTP transport"),
    sesClient: (region) => {
      assert.equal(region, "us-east-1")
      return {
        send: async (command) => {
          assert.ok(command instanceof SendEmailCommand)
          calls.push(command.input)
        },
      }
    },
  })
  await send(message)
  assert.deepEqual(calls, [
    {
      FromEmailAddress: ses.EMAIL_FROM,
      Destination: { ToAddresses: [message.to] },
      ConfigurationSetName: ses.SES_CONFIGURATION_SET,
      Content: {
        Simple: {
          Subject: { Data: message.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: message.text, Charset: "UTF-8" },
            Html: { Data: message.html, Charset: "UTF-8" },
          },
        },
      },
    },
  ])
})

test("SES preserves text-only invites, supports identity defaults and never accepts a caller From override", async () => {
  const source = {
    EMAIL_PROVIDER: ses.EMAIL_PROVIDER,
    EMAIL_FROM: ses.EMAIL_FROM,
    AWS_REGION: ses.AWS_REGION,
  }
  const calls = []
  const send = createMailSender(getMailConfiguration(source), {
    sesClient: () => ({ send: async (command) => calls.push(command.input) }),
  })
  const textOnly = {
    to: message.to,
    subject: message.subject,
    text: message.text,
  }
  await send({ ...textOnly, from: "unapproved@example.com" })
  assert.equal(calls[0].FromEmailAddress, ses.EMAIL_FROM)
  assert.equal(calls[0].ConfigurationSetName, undefined)
  assert.equal(calls[0].Content.Simple.Body.Html, undefined)
  assert.equal(calls[0].Content.Simple.Body.Text.Data, message.text)
})

test("invalid or incomplete mail configuration fails without exposing supplied values", () => {
  const bad = [
    { ...smtp, EMAIL_PROVIDER: "unknown-fixture-value" },
    { ...smtp, SMTP_PASSWORD: undefined },
    { ...smtp, SMTP_HOST: " " },
    { ...smtp, SMTP_PORT: "0" },
    { ...smtp, SMTP_PORT: "65536" },
    { ...smtp, SMTP_PORT: "1.5" },
    { ...smtp, SMTP_PORT: "587garbage" },
    { ...ses, EMAIL_FROM: undefined },
    { ...ses, EMAIL_FROM: "invalid-fixture-value" },
    { ...ses, EMAIL_FROM: "user@example.com\r\nBcc: other@example.com" },
    { ...ses, AWS_REGION: undefined },
    { ...ses, AWS_REGION: "https://untrusted.invalid" },
    { ...ses, SES_CONFIGURATION_SET: "bad/fixture-value" },
  ]
  for (const config of bad) {
    assert.throws(
      () => getMailConfiguration(config),
      (error) => {
        assert.ok(error instanceof Error)
        assert.ok(!error.message.includes("fixture-secret"))
        assert.ok(!error.message.includes("fixture-value"))
        assert.ok(!error.message.includes("other@example.com"))
        return true
      },
    )
  }
})

test("SES failures are sanitized and never retried or sent through SMTP", async () => {
  let attempts = 0
  const send = createMailSender(getMailConfiguration(ses), {
    smtpTransport: () => assert.fail("must not fall back to SMTP"),
    sesClient: () => ({
      send: async () => {
        attempts++
        throw new Error("fixture-secret member@example.com OTP 123456")
      },
    }),
  })
  await assert.rejects(send(message), {
    name: "Error",
    message: "Email delivery failed",
  })
  assert.equal(attempts, 1)
})

test("SMTP failures are sanitized and never fall back to SES", async () => {
  let attempts = 0
  const send = createMailSender(getMailConfiguration(smtp), {
    sesClient: () => assert.fail("must not fall back to SES"),
    smtpTransport: () => ({
      sendMail: async () => {
        attempts++
        throw new Error("fixture-secret member@example.com OTP 123456")
      },
    }),
  })
  await assert.rejects(send(message), { message: "Email delivery failed" })
  assert.equal(attempts, 1)
})

test("all application mail paths share the server sender; no import/build-time client or credential use", async () => {
  const auth = await readFile(
    new URL("../src/server/auth/config.ts", import.meta.url),
    "utf8",
  )
  const invites = await readFile(
    new URL("../src/server/mail.ts", import.meta.url),
    "utf8",
  )
  const wrapper = await readFile(
    new URL("../src/server/email.ts", import.meta.url),
    "utf8",
  )
  const transport = await readFile(
    new URL("../src/server/mail/transport.ts", import.meta.url),
    "utf8",
  )
  assert.equal((auth.match(/await sendEmail\(/g) ?? []).length, 2)
  assert.equal((invites.match(/await sendEmail\(/g) ?? []).length, 1)
  assert.ok(!auth.includes("createTransport"))
  assert.ok(!invites.includes("createTransport"))
  assert.match(wrapper, /sender \?\?= createMailSender/)
  assert.match(transport, /maxAttempts: 1/)
  assert.ok(!transport.includes("process.env"))
  assert.ok(!transport.includes("NEXT_PUBLIC"))
})
