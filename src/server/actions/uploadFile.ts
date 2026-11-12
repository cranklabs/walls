"use server"

import { fromByteArray } from "base64-js"
import { revalidatePath } from "next/cache"
import sharp from "sharp"

import { getSession } from "../auth"
import { existsFileName, insertFile } from "../db/queries"

function name(basename: string, count: number) {
  return basename + (count > 1 ? `-${count.toString()}` : "") + ".jpeg"
}

async function getNormalSize(input: Buffer) {
  const { width, height, orientation } = await sharp(input).metadata()
  return (orientation ?? 0) >= 5
    ? { width: height, height: width }
    : { width, height }
}

export async function uploadFile(file: File) {
  const session = await getSession()
  if (!session)
    return {
      status: "error" as const,
      message: "Not authenticated",
    }
  console.log("Upload file", session.user.name, file.name)

  const jpeg = await sharp(await file.arrayBuffer())
    .toFormat("jpeg")
    .toBuffer()

  const { width, height } = await getNormalSize(jpeg)
  if (!width || !height) {
    return {
      status: "error" as const,
      message: "Invalid image",
    }
  }

  console.log("file name", file.name)
  const basename = file.name.split(".").slice(0, -1).join(".")
  console.log("basename", basename)
  let count = 1
  while (await existsFileName(name(basename, count))) {
    count++
  }

  const base64 = fromByteArray(jpeg)

  await insertFile({
    userId: session.user.id,
    name: name(basename, count),
    base64: base64,
    height,
    width,
    size: file.size,
  })

  revalidatePath("/my-walls")

  return {
    status: "success" as const,
  }
}
