import { redirect } from "next/navigation"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getSession } from "@/server/auth"
import { hasExistingRequest } from "@/server/db/queries"

import { RequestAccessForm } from "./form"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getSession()
  if (session) redirect("/")

  const email = ((await searchParams).email as string | undefined) ?? ""

  const alreadyRequested =
    email.trim() !== "" && (await hasExistingRequest(email))

  return (
    <div className="flex grow items-center justify-center">
      <Card>
        <CardHeader>
          <div className="relative h-6">
            <h1 className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-card px-4 text-center font-clash text-2xl font-semibold text-card-foreground">
              REQUEST ACCESS
            </h1>
            <div className="absolute left-1/2 top-1/2 z-10 w-full -translate-x-1/2 border-t"></div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 pb-2">
          <p className="text-center text-sm text-muted-foreground">
            This instance is invite-only. Submit a request and an administrator
            will review it.
          </p>
          <RequestAccessForm
            initialEmail={email}
            alreadyRequested={alreadyRequested}
          />
        </CardContent>
      </Card>
    </div>
  )
}
