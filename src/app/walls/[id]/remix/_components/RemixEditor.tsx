"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { RemixConfig, TextBlock } from "@/server/remix/types"

import { Canvas } from "./Canvas"
import { PropertyPanel } from "./PropertyPanel"
import { SaveBar } from "./SaveBar"

type RemixEditorProps = {
  sourceId: number
  sourceName: string
  sourceWidth: number
  sourceHeight: number
  initialConfig: RemixConfig | null
  sourceOwnerId: string
  sessionUserId: string
  isOwner: boolean
  isAdmin: boolean
}

function sourceBasename(sourceName: string): string {
  if (!sourceName.includes(".")) return sourceName
  return sourceName.split(".").slice(0, -1).join(".")
}

function createTextBlock(): TextBlock {
  return {
    id: crypto.randomUUID(),
    text: "Your text here",
    fontId: "satoshi",
    fontSize: 48,
    fontWeight: "bold",
    italic: false,
    color: "#ffffff",
    alignment: "center",
    lineHeight: 1.2,
    letterSpacing: 0,
    maxWidthPct: 80,
    autoInverse: false,
    xPct: 50,
    yPct: 50,
    outline: { enabled: false, color: "#000000", width: 0 },
    shadow: {
      enabled: false,
      color: "#000000",
      offsetX: 0,
      offsetY: 0,
      blur: 0,
    },
    backdrop: { enabled: false, color: "#000000", opacity: 0, padding: 0 },
    blurBehind: { enabled: false, radius: 10 },
  }
}

function moveBlock(blocks: TextBlock[], id: string, direction: -1 | 1) {
  const index = blocks.findIndex((block) => block.id === id)
  if (index < 0) return blocks

  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= blocks.length) return blocks

  const reordered = [...blocks]
  const current = reordered[index]
  const next = reordered[nextIndex]
  if (!current || !next) return blocks

  reordered[index] = next
  reordered[nextIndex] = current
  return reordered
}

export function RemixEditor({
  sourceId,
  sourceName,
  sourceWidth,
  sourceHeight,
  initialConfig,
  sourceOwnerId,
  sessionUserId,
  isOwner: _isOwner,
  isAdmin,
}: RemixEditorProps) {
  const router = useRouter()
  const [blocks, setBlocks] = useState<TextBlock[]>(initialConfig?.blocks ?? [])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [name, setName] = useState(`${sourceBasename(sourceName)}-remix-1.jpeg`)

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  )

  function addTextBlock() {
    if (blocks.length >= 10) {
      toast.warning("Maximum 10 text blocks reached")
      return
    }

    const block = createTextBlock()
    setBlocks((currentBlocks) => [...currentBlocks, block])
    setSelectedBlockId(block.id)
  }

  function moveBlockUp(id: string) {
    setBlocks((currentBlocks) => moveBlock(currentBlocks, id, -1))
  }

  function moveBlockDown(id: string) {
    setBlocks((currentBlocks) => moveBlock(currentBlocks, id, 1))
  }

  function updateBlock(updatedBlock: TextBlock) {
    setBlocks((currentBlocks) =>
      currentBlocks.map((block) =>
        block.id === updatedBlock.id ? updatedBlock : block,
      ),
    )
  }

  function deleteBlock(id: string) {
    setBlocks((currentBlocks) =>
      currentBlocks.filter((block) => block.id !== id),
    )
    setSelectedBlockId((currentSelectedId) =>
      currentSelectedId === id ? null : currentSelectedId,
    )
  }

  return (
    <main className="flex flex-grow flex-col gap-4 bg-background p-4 lg:min-h-0">
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Remix editor
          </p>
          <h1 className="break-words font-clash text-2xl font-bold uppercase leading-none sm:text-3xl md:text-4xl">
            {sourceName}
          </h1>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center lg:min-w-96 lg:shrink-0">
          <Button type="button" onClick={addTextBlock}>
            Add Text
          </Button>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Remix file name"
          />
        </div>
      </section>

      <section className="grid flex-grow gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          id="canvas-placeholder"
          className="flex flex-col gap-3 overflow-hidden rounded-xl border bg-card p-4 shadow lg:min-h-96"
          data-source-id={sourceId}
          data-source-name={sourceName}
          data-source-width={sourceWidth}
          data-source-height={sourceHeight}
          data-block-count={blocks.length}
          data-selected-block-id={selectedBlockId ?? ""}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Canvas
              </p>
              <p className="break-all text-sm text-muted-foreground">
                Preview source: /uploads/{sourceName}
              </p>
            </div>
            <div className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
              {sourceWidth}×{sourceHeight}
            </div>
          </div>
          <div className="flex flex-grow items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted p-2 [--canvas-max-h:60vh] lg:[--canvas-max-h:calc(100vh-24rem)]">
            <Canvas
              sourceName={sourceName}
              sourceWidth={sourceWidth}
              sourceHeight={sourceHeight}
              blocks={blocks}
              selectedBlockId={selectedBlockId}
              onSelect={setSelectedBlockId}
              onChange={updateBlock}
              onDelete={deleteBlock}
            />
          </div>
        </div>

        <PropertyPanel
          block={selectedBlock}
          onChange={updateBlock}
          onDelete={() => selectedBlockId && deleteBlock(selectedBlockId)}
          onReorderUp={() => selectedBlockId && moveBlockUp(selectedBlockId)}
          onReorderDown={() =>
            selectedBlockId && moveBlockDown(selectedBlockId)
          }
        />
      </section>

      <SaveBar
        sourceId={sourceId}
        sourceOwnerId={sourceOwnerId}
        sessionUserId={sessionUserId}
        isAdmin={isAdmin}
        blocks={blocks}
        name={name}
        onSaved={(fileId) => router.push(`/walls/${fileId}`)}
      />
    </main>
  )
}
