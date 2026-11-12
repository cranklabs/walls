import { env } from "@/env"

import { getMailConfiguration } from "./mail/config"
import { createMailSender, type EmailMessage } from "./mail/transport"

let sender: ReturnType<typeof createMailSender> | undefined

export async function sendEmail(message: EmailMessage): Promise<void> {
  // Never resolve AWS credentials or initialize a mail client at build/import time.
  sender ??= createMailSender(getMailConfiguration(env))
  await sender(message)
}
