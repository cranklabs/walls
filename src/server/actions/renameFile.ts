"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getSession } from "../auth"
import { db } from "../db"
import { existsFileName, updateFile } from "../db/queries"
import { file } from "../db/schema"

function name(basename: string, count: number) {
  return basename + (count > 1 ? `-${count.toString()}` : "") + ".jpeg"
}

export async function renameFile({
  id,
  basename,
}: {
  id: number
  basename: string
}) {
  const session = await getSession()
  if (!session)
    return {
      status: "error" as const,
      message: "Not authenticated",
    }

  const owners = await db
    .select({
      owner: file.uploadedBy,
    })
    .from(file)
    .where(eq(file.id, id))
    .limit(1)

  if (!owners[0]) return { status: "error" as const, message: "File not found" }
  if (!session.user.isAdmin && owners[0].owner !== session.user.id) {
    return {
      status: "error" as const,
      message: "Not authorized",
    }
  }

  console.log("basename", basename)
  let count = 1
  while (await existsFileName(name(basename, count))) {
    count++
  }

  const newName = name(basename, count)
  await updateFile({
    id,
    name: newName,
  })

  revalidatePath(`/walls/${id}`)

  return {
    status: "success" as const,
    message: `Renamed to ${newName}`,
  }
}
