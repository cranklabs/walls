import { redirect } from "next/navigation"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getSession } from "@/server/auth"

import { AuthCardTitle } from "../_components/auth-card-title"
import { PasswordSignInForm } from "../_components/password-sign-in-form"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSession()
  if (session) redirect("/")

  const params = await searchParams
  const email = typeof params.email === "string" ? params.email : ""

  return (
    <div className="flex grow items-center justify-center">
      <Card>
        <CardHeader>
          <AuthCardTitle>SIGN IN</AuthCardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {params.reset === "1" && (
            <div
              role="status"
              className="w-72 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
            >
              Password updated. Sign in with your new password.
            </div>
          )}
          <p className="text-center text-sm text-muted-foreground">
            Sign in with your email and password.
          </p>
          <PasswordSignInForm initialEmail={email} />
        </CardContent>
      </Card>
    </div>
  )
}
