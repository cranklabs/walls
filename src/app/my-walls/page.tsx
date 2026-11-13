import { Wall } from "@/components/wall"
import { ensureAuth } from "@/server/auth"
import { getUploads } from "@/server/db/queries"

import { Dropzone } from "./_components/dropzone"
import { InputUrl } from "./_components/input-url"

export default async function Page() {
  const session = await ensureAuth()

  const uploads = await getUploads(session.user.id)

  return (
    <div>
      <div className="mb-8 bg-neutral-200 py-10 text-center dark:bg-neutral-800">
        <h1 className="font-clash text-5xl font-bold uppercase sm:text-6xl">
          My Walls
        </h1>
        <p className="font-clash text-xl">
          You have {uploads.length} backgrounds
        </p>
      </div>
      <div className="mx-auto flex w-full flex-col gap-8 px-4 md:w-4/5 md:px-0">
        <Dropzone />
        <InputUrl />
        <Wall images={uploads} />
      </div>
    </div>
  )
}
