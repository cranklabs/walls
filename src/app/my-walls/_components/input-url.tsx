"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { clientOS } from "@/lib/client"
import { uploadFileUsingUrl } from "@/server/actions/uploadFileUsingUrl"

const UploadButton = dynamic(
  () => import("./upload-button").then((mod) => mod.UploadButton),
  { ssr: false },
)

export function InputUrl() {
  const [url, setUrl] = useState("")
  const [disabled, setDisabled] = useState(false)

  async function submit() {
    if (disabled) return
    if (!url) {
      toast.error("Please enter a URL")
      return
    }
    setDisabled(true)
    try {
      const resp = await uploadFileUsingUrl(url)
      if (resp.status == "success") {
        setUrl("")
        toast.success(resp.message)
      } else {
        throw new Error(resp.message ?? undefined)
      }
    } catch (err) {
      if (err instanceof Error) {
        toast.error(`Failed to upload`, {
          description: err.message,
        })
      }
    } finally {
      setDisabled(false)
    }
  }

  const os = clientOS()

  return (
    <div className="flex gap-2">
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-grow"
        placeholder="Paste an image link to upload it"
        onKeyDown={async (e) => {
          if (
            (os === "mac" && e.key === "Enter" && e.metaKey) ||
            ((os === "windows" || os === "linux") &&
              e.key === "Enter" &&
              e.ctrlKey)
          ) {
            await submit()
          }
        }}
      />
      <UploadButton onClick={submit} disabled={disabled} />
    </div>
  )
}
