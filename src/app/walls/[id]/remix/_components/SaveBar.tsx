"use client"

import { useState } from "react"
import { CgSpinnerTwo } from "react-icons/cg"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { saveRemix } from "@/server/actions/saveRemix"
import type { TextBlock } from "@/server/remix/types"

type SaveMode = "overwrite" | "new-variant"

type SaveBarProps = {
  sourceId: number
  sourceOwnerId: string
  sessionUserId: string
  isAdmin: boolean
  blocks: TextBlock[]
  name: string
  onSaved: (fileId: number) => void
}

function buttonLabel(mode: SaveMode, savingMode: SaveMode | null) {
  if (savingMode === mode) return "Saving..."
  return mode === "overwrite" ? "Save" : "Save as new variant"
}

export function SaveBar({
  sourceId,
  sourceOwnerId,
  sessionUserId,
  isAdmin,
  blocks,
  name,
  onSaved,
}: SaveBarProps) {
  const [savingMode, setSavingMode] = useState<SaveMode | null>(null)

  const canOverwrite = sessionUserId === sourceOwnerId || isAdmin
  const isSaving = savingMode !== null
  const hasBlocks = blocks.length > 0

  async function handleSave(mode: SaveMode) {
    if (isSaving || !hasBlocks) return

    setSavingMode(mode)
    try {
      const result = await saveRemix({
        sourceId,
        mode,
        config: { type: "text-overlay", version: 1, blocks },
        name,
      })

      if (result.status === "success") {
        onSaved(result.fileId)
      } else {
        toast.error(result.message)
      }
    } finally {
      setSavingMode(null)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Save remix
        </p>
        <p className="text-sm text-muted-foreground">
          {blocks.length} text {blocks.length === 1 ? "block" : "blocks"} ready
          to save.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {canOverwrite ? (
          <Button
            type="button"
            variant="outline"
            disabled={!hasBlocks || isSaving}
            onClick={() => handleSave("overwrite")}
          >
            {savingMode === "overwrite" ? (
              <CgSpinnerTwo className="animate-spin" />
            ) : null}
            {buttonLabel("overwrite", savingMode)}
          </Button>
        ) : null}
        <Button
          type="button"
          disabled={!hasBlocks || isSaving}
          onClick={() => handleSave("new-variant")}
        >
          {savingMode === "new-variant" ? (
            <CgSpinnerTwo className="animate-spin" />
          ) : null}
          {buttonLabel("new-variant", savingMode)}
        </Button>
      </div>
    </section>
  )
}
