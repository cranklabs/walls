import { eq } from "drizzle-orm"
import moment from "moment"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PiSignOut, PiSignOutDuotone } from "react-icons/pi"

import { FancyHoverIcon } from "@/components/fancy-hover-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Wall } from "@/components/wall"
import { getSession } from "@/server/auth"
import { db } from "@/server/db"
import { getUploads } from "@/server/db/queries"
import { users } from "@/server/db/schema"
import { ensureGuestAccessOrAuth } from "@/server/guest-access"

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  await ensureGuestAccessOrAuth()

  const session = await getSession()
  const { userId } = await params
  const user = (await db.select().from(users).where(eq(users.id, userId)))[0]

  if (!user) notFound()

  const uploads = await getUploads(user.id)

  return (
    <div className="mx-auto w-4/5">
      <div className="mt-8 flex gap-4">
        <div className="flex grow items-center justify-between rounded-xl border bg-neutral-200 p-4 shadow-xl dark:bg-neutral-800">
          <div className="flex items-center gap-4">
            <Avatar className="size-10">
              {user.image ? (
                <AvatarImage src={user.image} alt={user.name ?? ""} />
              ) : null}
              <AvatarFallback>{user.name![0]!}</AvatarFallback>
            </Avatar>
            <div className="text-xl font-semibold">{user.name}</div>
          </div>
          <div className="flex flex-col items-end text-neutral-500">
            <div>{uploads.length} walls</div>
            <div>Joined {moment(user.joinedAt).fromNow()}</div>
          </div>
        </div>
        {session?.user.id === user.id ? (
          <Link href="/signout" className="">
            <Button
              className="h-full bg-red-100 shadow-xl shadow-red-100 hover:bg-red-200"
              variant="secondary"
            >
              <FancyHoverIcon
                className="w-6"
                hover={<PiSignOutDuotone className="scale-150 text-red-500" />}
                nohover={<PiSignOut className="scale-150 text-red-500" />}
              />
            </Button>
          </Link>
        ) : null}
      </div>
      <div className="mt-8 flex flex-col gap-8">
        <Wall images={uploads} />
      </div>
    </div>
  )
}
