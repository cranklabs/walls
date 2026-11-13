import { redirect } from "next/navigation"

import { Wall } from "@/components/wall"
import { getHomepageImages } from "@/server/db/queries"
import { ensureGuestAccessOrAuth } from "@/server/guest-access"
import { _getRedirectToMyWallCurrentUser } from "@/server/settings"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await ensureGuestAccessOrAuth()

  const images = await getHomepageImages()
  const redirectToMyWall = await _getRedirectToMyWallCurrentUser()
  const noRedirect = (await searchParams).redirect === "false"

  if (redirectToMyWall && !noRedirect) {
    redirect("/my-walls")
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center bg-neutral-200 py-10 dark:bg-neutral-800">
        <h1 className="font-clash text-6xl font-bold uppercase">Walls</h1>
        <h2 className="font-clash text-xl">Backgrounds for your screens</h2>
      </div>
      <div className="mx-auto w-full px-4 md:w-4/5 md:px-0">
        <Wall images={images} />
      </div>
    </div>
  )
}
