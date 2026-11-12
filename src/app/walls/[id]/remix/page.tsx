import { notFound, redirect } from "next/navigation"

import { getSession } from "@/server/auth"
import { getImageMd } from "@/server/db/queries"
import { ensureGuestAccessOrAuth } from "@/server/guest-access"

import { RemixEditor } from "./_components/RemixEditor"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await ensureGuestAccessOrAuth()

  const { id } = await params
  const nextPath = `/walls/${id}/remix`
  const session = await getSession()

  if (!session) {
    redirect(`/signin?next=${nextPath}`)
  }

  if (session.user.blocked) {
    notFound()
  }

  const sourceId = Number(id)
  if (!Number.isInteger(sourceId)) {
    notFound()
  }

  const source = await getImageMd(sourceId)
  if (!source) {
    notFound()
  }

  const isAdmin = session.user.isAdmin === true
  const isOwner = session.user.id === source.uploader.id

  return (
    <RemixEditor
      sourceId={source.id}
      sourceName={source.name}
      sourceWidth={source.width}
      sourceHeight={source.height}
      initialConfig={source.remixConfig}
      sourceOwnerId={source.uploader.id}
      sessionUserId={session.user.id}
      isOwner={isOwner}
      isAdmin={isAdmin}
    />
  )
}
