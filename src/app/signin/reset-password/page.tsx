import Link from "next/link"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { AuthCardTitle } from "../_components/auth-card-title"
import { ResetPasswordForm } from "../_components/reset-password-form"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === "string" ? params.token : null
  const invalid = !token || typeof params.error === "string"

  return (
    <div className="flex grow items-center justify-center">
      <Card>
        <CardHeader>
          <AuthCardTitle>NEW PASSWORD</AuthCardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {invalid ? (
            <>
              <div
                role="alert"
                className="w-72 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
              >
                This reset link is invalid or has expired.
              </div>
              <Link
                href="/signin/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Request a new link
              </Link>
            </>
          ) : (
            <>
              <p className="max-w-72 text-center text-sm text-muted-foreground">
                Choose a new password. You&apos;ll be signed out everywhere and
                can then sign in with it.
              </p>
              <ResetPasswordForm token={token} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
