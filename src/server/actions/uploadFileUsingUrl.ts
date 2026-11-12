"use server"

import { randomUUID } from "crypto"

import { uploadFile } from "./uploadFile"

export async function uploadFileUsingUrl(url: string) {
  const filename = url.split("/").pop() ?? `file-${randomUUID()}`
  try {
    const fetchResp = await fetch(url)
    if (!fetchResp.ok) {
      throw new Error("Failed to fetch file from URL")
    }

    const blob = await fetchResp.blob()
    if (blob.size > 100 * 1024 * 1024) {
      throw new Error("File exceeds size limit (100MB)")
    }

    const file = new File([blob], filename, { type: blob.type })
    if (file.size > 100 * 1024 * 1024) {
      throw new Error("File exceeds size limit (100MB)")
    }
    const resp = await uploadFile(file)
    if (resp.status == "success") {
      return {
        status: "success" as const,
        message: `Uploaded ${file.name}`,
      }
    }
    return resp
  } catch (err) {
    if (err instanceof Error) {
      return {
        status: "error" as const,
        message: err.message,
      }
    }
  }
  return {
    status: "error" as const,
    message: "Failed to upload file",
  }
}
