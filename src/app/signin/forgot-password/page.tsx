import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { AuthCardTitle } from "../_components/auth-card-title"
import { ForgotPasswordForm } from "../_components/forgot-password-form"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const email = typeof params.email === "string" ? params.email : ""

  return (
    <div className="flex grow items-center justify-center">
      <Card>
        <CardHeader>
          <AuthCardTitle>RESET PASSWORD</AuthCardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="max-w-72 text-center text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you a link to set a new
            password.
          </p>
          <ForgotPasswordForm initialEmail={email} />
        </CardContent>
      </Card>
    </div>
  )
}
