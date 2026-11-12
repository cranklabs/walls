import { redirect } from "next/navigation"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getSession } from "@/server/auth"

import { CancelAndGoBack } from "./_components/cancel"
import { SignOutButton } from "./_components/sign-out-button"

export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/")

  return (
    <div className="flex grow items-center justify-center">
      <Card>
        <CardHeader>
          <div className="relative h-4">
            <h1 className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-white px-4 text-center font-clash text-2xl font-semibold text-neutral-800">
              SIGN OUT
            </h1>
            <div className="absolute left-1/2 top-1/2 z-10 w-full -translate-x-1/2 border-t"></div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="text-center">Are you sure you want to sign out?</div>
          <div className="grid grid-cols-2 gap-2">
            <CancelAndGoBack />
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
