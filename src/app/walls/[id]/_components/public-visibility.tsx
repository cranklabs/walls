"use client"

import { useState } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { setPublicVisibility } from "@/server/actions/set-public-visibility"

export function PublicVisibility({
  id,
  publicVisibility,
  className,
}: {
  id: number
  publicVisibility: boolean
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
      <div className="text-sm font-semibold">Visibility</div>
      <div
        className="relative h-6 w-16 shrink-0 cursor-pointer select-none overflow-hidden rounded-md bg-neutral-200 px-2 py-1 text-center text-xs uppercase transition-colors hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        onClick={async () => {
          if (submitting) return
          setSubmitting(true)
          const resp = await setPublicVisibility({
            id: id,
            publicVisibility: !publicVisibility,
          })
          if (resp.status === "error") {
            toast.error("Error while updating visibility", {
              description: resp.message,
            })
          } else {
            toast.success("Updated Visibility", {
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
              "top-1": publicVisibility,
              "-top-5": !publicVisibility,
            },
          )}
        >
          <div className="text-emerald-500">PUBLIC</div>
          <div className="text-amber-500">PRIVATE</div>
        </div>
      </div>
    </div>
  )
}
