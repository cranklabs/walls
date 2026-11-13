import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import prettyBytes from "pretty-bytes"

import { Back } from "@/components/back"
import { OptimizedImage } from "@/components/optimized-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getSession } from "@/server/auth"
import { getDescendants, getImageMd, getParentName } from "@/server/db/queries"
import { ensureGuestAccessOrAuth } from "@/server/guest-access"

import { DeleteFile } from "./_components/delete-file"
import { Nsfw } from "./_components/nsfw"
import { PublicVisibility } from "./_components/public-visibility"
import { RemixButton } from "./_components/remix-button"
import { RenameFile } from "./_components/rename-file"
import { VariantOf } from "./_components/variant-of"
import { VariantsSection } from "./_components/variants-section"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await ensureGuestAccessOrAuth()

  const image = await getImageMd(parseInt((await params).id))
  if (!image) {
    notFound()
  }

  const session = await getSession()
  const isOwner = session?.user.id == image.uploader.id
  const isAdmin = !!session?.user.isAdmin
  const parentName = image.parentId ? await getParentName(image.parentId) : null
  const descendants = (await getDescendants(image.id)).map((descendant) => ({
    ...descendant,
    nsfw: descendant.nsfw > 0,
  }))

  return (
    <div className="flex flex-grow flex-col gap-4 p-2 px-4 md:mx-auto md:w-[90%] md:justify-center md:p-0">
      <div className="grid grid-cols-2 gap-2 md:flex">
        <Back className="w-full md:mr-auto md:w-fit" />
        {session && !session.user.blocked && (
          <RemixButton id={image.id} className="w-full md:w-fit" />
        )}
        {isOwner || isAdmin ? (
          <>
            <PublicVisibility
              id={image.id}
              publicVisibility={image.publicVisibility}
              className="w-full md:w-fit"
            />
            <Nsfw id={image.id} nsfw={image.nsfw} className="w-full md:w-fit" />
            <RenameFile id={image.id} name={image.name} />
            <DeleteFile id={image.id} />
          </>
        ) : null}
      </div>
      {image.parentId ? (
        <div className="flex justify-center md:justify-start">
          <VariantOf
            parentId={image.parentId}
            parentName={parentName ?? "Unknown"}
          />
        </div>
      ) : null}
      <div className="break-all text-center">{image.name}</div>
      <OptimizedImage
        name={image.name}
        width={1920}
        height={800}
        className="mx-auto max-h-[60vh] w-auto max-w-full object-contain md:max-w-[80vw]"
      />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="col-span-2 row-start-2 flex items-center justify-between gap-4 md:col-span-1 md:row-start-1 md:justify-normal">
          <a
            href={`/uploads/${image.name}`}
            download
            className="w-full md:w-auto"
          >
            <Button className="w-full">Download</Button>
          </a>
          <a
            href={`/uploads/${image.name}`}
            target="_blank"
            className="w-full md:w-auto"
          >
            <Button variant="secondary" className="w-full">
              Open in new tab
            </Button>
          </a>
        </div>
        <div className="row-start-1 flex items-center gap-2 whitespace-nowrap md:justify-center">
          <Badge>
            {image.width}x{image.height}
          </Badge>
          <Badge>{prettyBytes(image.size)}</Badge>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-4">
          <p className="hidden shrink-0 md:block">Uploaded by</p>
          <Link
            href={`/profile/${image.uploader.id}`}
            className="flex min-w-0 items-center gap-2 rounded-lg bg-neutral-100 px-2 py-1 dark:bg-neutral-900"
          >
            {image.uploader.image ? (
              <Image
                src={image.uploader.image}
                alt={image.uploader.name ?? ""}
                width={24}
                height={24}
                className="shrink-0 rounded-full"
              />
            ) : null}
            <p className="truncate" title={image.uploader.name ?? undefined}>
              {image.uploader.name}
            </p>
          </Link>
        </div>
      </div>
      <VariantsSection
        descendants={descendants}
        sessionUserId={session?.user.id}
        isAdmin={session?.user.isAdmin ?? undefined}
      />
    </div>
  )
}
