import { z } from "zod"

export interface MailEnvironment {
  EMAIL_PROVIDER?: string
  EMAIL_FROM?: string
  SMTP_HOST?: string
  SMTP_PORT?: string
  SMTP_USERNAME?: string
  SMTP_PASSWORD?: string
  SMTP_MAIL_FROM?: string
  AWS_REGION?: string
  SES_CONFIGURATION_SET?: string
}

export type MailConfiguration =
  | {
      provider: "smtp"
      from: string
      host: string
      port: number
      username: string
      password: string
    }
  | {
      provider: "ses"
      from: string
      region: string
      configurationSet?: string
    }

export function getMailConfiguration(
  source: MailEnvironment,
): MailConfiguration {
  const provider = source.EMAIL_PROVIDER ?? "smtp"
  if (provider !== "smtp" && provider !== "ses") {
    throw new Error("EMAIL_PROVIDER must be smtp or ses")
  }

  const from = source.EMAIL_FROM ?? source.SMTP_MAIL_FROM
  if (!from || !z.string().email().safeParse(from).success) {
    throw new Error("Configure a valid EMAIL_FROM or legacy SMTP_MAIL_FROM")
  }

  if (provider === "ses") {
    const region = source.AWS_REGION
    if (!region || !/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(region)) {
      throw new Error("SES email requires a valid AWS_REGION")
    }
    const configurationSet = source.SES_CONFIGURATION_SET
    if (
      configurationSet !== undefined &&
      !/^[A-Za-z0-9_-]{1,64}$/.test(configurationSet)
    ) {
      throw new Error(
        "Configure a valid SES_CONFIGURATION_SET or leave it unset",
      )
    }
    return { provider, from, region, configurationSet }
  }

  const rawPort = source.SMTP_PORT ?? "587"
  const port = Number(rawPort)
  if (
    !source.SMTP_HOST?.trim() ||
    !source.SMTP_USERNAME ||
    !source.SMTP_PASSWORD ||
    !/^\d+$/.test(rawPort) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      "SMTP email requires SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD and a valid SMTP_PORT",
    )
  }
  return {
    provider,
    from,
    host: source.SMTP_HOST,
    port,
    username: source.SMTP_USERNAME,
    password: source.SMTP_PASSWORD,
  }
}
