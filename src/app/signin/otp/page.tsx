import { redirect } from "next/navigation"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getSession } from "@/server/auth"

import { VerifyOtpForm } from "../_components/verify-otp-form"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSession()
  if (session) redirect("/")

  const params = await searchParams
  const email = typeof params.email === "string" ? params.email : null
  if (!email) redirect("/signin")

  return (
    <div className="flex grow items-center justify-center">
      <Card>
        <CardHeader>
          <div className="relative h-6">
            <h1 className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-card px-4 text-center font-clash text-2xl font-semibold text-card-foreground">
              ENTER OTP
            </h1>
            <div className="absolute left-1/2 top-1/2 z-10 w-full -translate-x-1/2 border-t"></div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 px-10">
          <p className="max-w-72 text-center text-sm text-muted-foreground">
            A one-time password has been sent to your email address. Please
            enter the code in the email to sign in.
          </p>
          <p className="max-w-72 break-all text-center text-xs text-muted-foreground/70">
            {email}
          </p>
          <VerifyOtpForm email={email} />
          <p className="mt-2 text-center text-xs text-muted-foreground/70">
            {`If you don't see it, check your spam folder.`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
