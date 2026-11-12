"use client"

import { useState } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { setImageNsfw } from "@/server/actions/setImageNsfw"

export function Nsfw({
  id,
  nsfw,
  className,
}: {
  id: number
  nsfw: number
  className?: string
}) {
  const [submitting, setSubmitting] = useState(false)
  return (
    <div
      className={cn(
        "flex items-center justify-around gap-2 rounded-md bg-neutral-100 px-2 py-1.5 dark:bg-neutral-900",
        className,
      )}
    >
      <div className="text-sm font-semibold">NSFW</div>
      <div
        className="relative h-6 w-16 cursor-pointer select-none overflow-hidden rounded-md bg-neutral-200 px-2 py-1 text-center text-xs uppercase transition-colors hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        onClick={async () => {
          if (submitting) return
          setSubmitting(true)
          const resp = await setImageNsfw({
            id: id,
            nsfw: (nsfw + 1) % 3,
          })
          if (resp.status === "error") {
            toast.error("Error while updating NSFW", {
              description: resp.message,
            })
          } else {
            toast.success("Updated NSFW", {
              description: resp.message,
            })
          }
          setSubmitting(false)
        }}
      >
        <div
          className={cn(
            "absolute left-1/2 flex -translate-x-1/2 flex-col gap-2 font-semibold transition-all",
            {
              "top-1": nsfw === 0,
              "-top-5": nsfw === 1,
              "-top-11": nsfw === 2,
            },
          )}
        >
          <div className="text-neutral-500">NONE</div>
          <div className="text-amber-500">MILD</div>
          <div className="text-rose-500">EXTREME</div>
        </div>
      </div>
    </div>
  )
}
