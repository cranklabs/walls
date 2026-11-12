"use client"

import { useRef, useState } from "react"
import type { MouseEvent, PointerEvent } from "react"

import { cn } from "@/lib/utils"
import type { TextBlock } from "@/server/remix/types"

const FONT_SIZE_TO_HEIGHT_RATIO = 1.2
const MIN_NODE_HEIGHT_PX = 32

type DragStart = {
  pointerId: number
  clientX: number
  clientY: number
  xPct: number
  yPct: number
  canvasWidth: number
  canvasHeight: number
  hasMoved: boolean
}

type TextBlockNodeProps = {
  block: TextBlock
  isSelected: boolean
  canvasWidth: number
  canvasHeight: number
  onSelect: (id: string) => void
  onChange: (block: TextBlock) => void
  onDelete: (id: string) => void
}

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function countDisplayLines(text: string): number {
  return Math.max(1, text.split("\n").length)
}

export function TextBlockNode({
  block,
  isSelected,
  canvasWidth,
  canvasHeight,
  onSelect,
  onChange,
  onDelete,
}: TextBlockNodeProps) {
  const dragStartRef = useRef<DragStart | null>(null)
  const suppressClickRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  const estimatedHeightPx = Math.max(
    MIN_NODE_HEIGHT_PX,
    block.fontSize *
      countDisplayLines(block.text) *
      block.lineHeight *
      FONT_SIZE_TO_HEIGHT_RATIO,
  )
  const heightPct =
    canvasHeight > 0 ? (estimatedHeightPx / canvasHeight) * 100 : 0

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return

    const canvasRect =
      event.currentTarget.parentElement?.getBoundingClientRect()

    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
    dragStartRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      xPct: block.xPct,
      yPct: block.yPct,
      canvasWidth: canvasRect?.width ?? canvasWidth,
      canvasHeight: canvasRect?.height ?? canvasHeight,
      hasMoved: false,
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragStart = dragStartRef.current
    if (dragStart?.pointerId !== event.pointerId) return

    const deltaXPx = event.clientX - dragStart.clientX
    const deltaYPx = event.clientY - dragStart.clientY
    const deltaXPct =
      dragStart.canvasWidth > 0 ? (deltaXPx / dragStart.canvasWidth) * 100 : 0
    const deltaYPct =
      dragStart.canvasHeight > 0 ? (deltaYPx / dragStart.canvasHeight) * 100 : 0
    const nextXPct = clampPct(dragStart.xPct + deltaXPct)
    const nextYPct = clampPct(dragStart.yPct + deltaYPct)

    if (Math.abs(deltaXPx) > 2 || Math.abs(deltaYPx) > 2) {
      dragStart.hasMoved = true
    }

    onChange({ ...block, xPct: nextXPct, yPct: nextYPct })
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    const dragStart = dragStartRef.current
    if (dragStart?.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsDragging(false)
    suppressClickRef.current = dragStart.hasMoved
    dragStartRef.current = null
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation()
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onSelect(block.id)
  }

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onDelete(block.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Text block: ${block.text || "empty"}`}
      className={cn(
        "absolute z-10 touch-none select-none rounded-md border border-transparent transition-[border-color,box-shadow,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected &&
          "border-primary bg-background/10 shadow-[0_0_0_1px_hsl(var(--background)),0_0_0_3px_hsl(var(--primary))]",
      )}
      style={{
        left: `${block.xPct}%`,
        top: `${block.yPct}%`,
        width: `${block.maxWidthPct}%`,
        minHeight: `${heightPct}%`,
        transform: "translate(-50%, -50%)",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect(block.id)
        }
      }}
    >
      {isSelected ? (
        <button
          type="button"
          aria-label="Delete text block"
          className="absolute -right-3 -top-3 flex size-6 items-center justify-center rounded-full border bg-destructive text-sm font-bold leading-none text-destructive-foreground shadow transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handleDelete}
        >
          ×
        </button>
      ) : null}
    </div>
  )
}
