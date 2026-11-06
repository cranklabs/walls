import type { MailConfiguration } from "./config"

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2"
import { createTransport } from "nodemailer"

export interface EmailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

interface MailDependencies {
  smtpTransport?: typeof createTransport
  sesClient?: (region: string) => {
    send(command: SendEmailCommand): Promise<unknown>
  }
}

export function createMailSender(
  config: MailConfiguration,
  dependencies: MailDependencies = {},
): (message: EmailMessage) => Promise<void> {
  if (config.provider === "ses") {
    const client = dependencies.sesClient
      ? dependencies.sesClient(config.region)
      : new SESv2Client({ region: config.region, maxAttempts: 1 })

    return async (message) => {
      try {
        await client.send(
          new SendEmailCommand({
            FromEmailAddress: config.from,
            Destination: { ToAddresses: [message.to] },
            ConfigurationSetName: config.configurationSet,
            Content: {
              Simple: {
                Subject: { Data: message.subject, Charset: "UTF-8" },
                Body: {
                  Text: { Data: message.text, Charset: "UTF-8" },
                  ...(message.html !== undefined
                    ? { Html: { Data: message.html, Charset: "UTF-8" } }
                    : {}),
                },
              },
            },
          }),
        )
      } catch {
        // Do not leak SDK request metadata, credentials, recipient or auth tokens.
        // No automatic SMTP fallback or application retry after an ambiguous send.
        throw new Error("Email delivery failed")
      }
    }
  }

  const transport = (dependencies.smtpTransport ?? createTransport)({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.username, pass: config.password },
  })
  return async (message) => {
    try {
      await transport.sendMail({ ...message, from: config.from })
    } catch {
      throw new Error("Email delivery failed")
    }
  }
}
