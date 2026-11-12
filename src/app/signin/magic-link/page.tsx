import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getSession } from "@/server/auth"
import { isDiscordEnabled } from "@/server/auth/config"

import { DiscordSignInButton } from "../_components/discord-sign-in-button"
import { MagicLinkSignInForm } from "../_components/magic-link-sign-in-form"
import { SignInError } from "../_components/sign-in-error"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSession()
  if (session) redirect("/")

  const params = await searchParams
  const sent = params.sent === "1"
  const email = typeof params.email === "string" ? params.email : null

  return (
    <div className="flex grow items-center justify-center">
      <Card>
        <CardHeader>
          <div className="relative h-6">
            <h1 className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-card px-4 text-center font-clash text-2xl font-semibold text-card-foreground">
              {sent ? "CHECK YOUR EMAIL" : "MAGIC LINK"}
            </h1>
            <div className="absolute left-1/2 top-1/2 z-10 w-full -translate-x-1/2 border-t"></div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 px-10">
          <SignInError
            error={typeof params.error === "string" ? params.error : undefined}
          />
          {sent ? (
            <>
              <p className="max-w-72 text-center text-sm text-muted-foreground">
                A sign-in link has been sent to your email address. Click the
                link in the email to sign in.
              </p>
              {email ? (
                <p className="max-w-72 break-all text-center text-xs text-muted-foreground/70">
                  {email}
                </p>
              ) : null}
              <p className="text-center text-xs text-muted-foreground/70">
                {`If you don't see it, check your spam folder.`}
              </p>
              <Link
                href="/signin/magic-link"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Send another magic link
              </Link>
            </>
          ) : (
            <>
              {isDiscordEnabled && (
                <>
                  <DiscordSignInButton />
                  <p className="text-xs text-muted-foreground">
                    or sign in by email
                  </p>
                </>
              )}
              <p className="max-w-72 text-center text-sm text-muted-foreground">
                Enter your email to receive a sign-in link.
              </p>
              <MagicLinkSignInForm />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
