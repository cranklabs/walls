"use client"

import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { uploadFile } from "@/server/actions/uploadFile"

export function Dropzone({ className }: { className?: string }) {
  const [uploadingFiles, setUploadingFiles] = useState<{
    total: number
    success: number
    error: number
  }>({
    total: 0,
    success: 0,
    error: 0,
  })
  const [disabled, setDisabled] = useState(false)

  async function handleUpload(file: File) {
    try {
      if (file.size > 100 * 1024 * 1024) {
        throw new Error("File exceeds size limit (100MB)")
      }
      const resp = await uploadFile(file)
      if (resp.status == "success") {
        setUploadingFiles((prev) => ({
          total: prev.total,
          success: prev.success + 1,
          error: prev.error,
        }))
        toast.success(`Uploaded ${file.name}`)
      } else {
        throw new Error(resp.message ?? undefined)
      }
    } catch (err) {
      if (err instanceof Error) {
        toast.error(`Failed uploading ${file.name}`, {
          description: err.message,
        })
      }
      setUploadingFiles((prev) => ({
        total: prev.total,
        success: prev.success,
        error: prev.error + 1,
      }))
    }
  }

  function onDrop(files: File[]) {
    setDisabled(true)
    setUploadingFiles((prev) => ({
      total: prev.total + files.length,
      success: prev.success,
      error: prev.error,
    }))
    Promise.all(files.map(handleUpload))
      .then(() => {
        setDisabled(false)
      })
      .catch(() => {
        toast.error("Failed to upload files")
      })
  }

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    disabled,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-400 bg-neutral-100 px-4 text-center transition-colors hover:bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-800",
        className,
      )}
    >
      <input {...getInputProps()} />
      <p className="text-2xl text-neutral-600 dark:text-neutral-400">
        Upload some beautiful backgrounds
      </p>
      {uploadingFiles.total > 0 ? (
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          {uploadingFiles.success + uploadingFiles.error ===
          uploadingFiles.total
            ? "Upload finished, refresh to see changes."
            : `Uploading ${uploadingFiles.total} files (${uploadingFiles.success} success, ${uploadingFiles.error} failed)`}
        </p>
      ) : null}
    </div>
  )
}
