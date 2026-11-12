"use client"

import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { FontId } from "@/server/remix/font-metadata"
import { FONTS } from "@/server/remix/font-metadata"
import type { TextBlock } from "@/server/remix/types"

type PropertyPanelProps = {
  block: TextBlock | null
  onChange: (block: TextBlock) => void
  onDelete: () => void
  onReorderUp: () => void
  onReorderDown: () => void
}

type PropertyPanelBodyProps = {
  block: TextBlock
  onChange: (block: TextBlock) => void
  onDelete: () => void
  onReorderUp: () => void
  onReorderDown: () => void
}

type SliderControlProps = {
  id: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  valueLabel?: string
  onValueChange: (value: number) => void
}

function toSliderValue(value: number): number[] {
  return [value]
}

function pickSliderValue(values: number[], fallback: number): number {
  return values[0] ?? fallback
}

function SliderControl({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  valueLabel,
  onValueChange,
}: SliderControlProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
          {valueLabel ?? value}
        </span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={toSliderValue(value)}
        onValueChange={(values) =>
          onValueChange(pickSliderValue(values, value))
        }
      />
    </div>
  )
}

function PanelSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function SwitchRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function ColorControl({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          maxLength={7}
          placeholder="#ffffff"
        />
        <Input
          aria-label={`${label} picker`}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-12 shrink-0 p-1"
        />
      </div>
    </div>
  )
}

function fontIdFromFamily(family: string): FontId {
  return FONTS.find((font) => font.family === family)?.id ?? "satoshi"
}

function familyFromFontId(fontId: TextBlock["fontId"]): string {
  return FONTS.find((font) => font.id === fontId)?.family ?? FONTS[0].family
}

function formatDecimal(value: number, digits = 1): string {
  return Number(value.toFixed(digits)).toString()
}

const SNAP_ANCHORS: ReadonlyArray<{
  xPct: number
  yPct: number
  label: string
}> = [
  { xPct: 10, yPct: 10, label: "Top left" },
  { xPct: 50, yPct: 10, label: "Top center" },
  { xPct: 90, yPct: 10, label: "Top right" },
  { xPct: 10, yPct: 50, label: "Middle left" },
  { xPct: 50, yPct: 50, label: "Middle center" },
  { xPct: 90, yPct: 50, label: "Middle right" },
  { xPct: 10, yPct: 90, label: "Bottom left" },
  { xPct: 50, yPct: 90, label: "Bottom center" },
  { xPct: 90, yPct: 90, label: "Bottom right" },
]

function SnapGrid({
  xPct,
  yPct,
  onSnap,
}: {
  xPct: number
  yPct: number
  onSnap: (xPct: number, yPct: number) => void
}) {
  return (
    <div
      role="group"
      aria-label="Snap to anchor"
      className="grid aspect-square w-full max-w-44 grid-cols-3 grid-rows-3 gap-1 rounded-lg border bg-background p-2"
    >
      {SNAP_ANCHORS.map((anchor) => {
        const isActive = anchor.xPct === xPct && anchor.yPct === yPct
        return (
          <button
            key={anchor.label}
            type="button"
            aria-label={anchor.label}
            aria-pressed={isActive}
            onClick={() => onSnap(anchor.xPct, anchor.yPct)}
            className={
              "flex items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              (isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted hover:bg-muted-foreground/20")
            }
          >
            <span className="size-1.5 rounded-full bg-current" />
          </button>
        )
      })}
    </div>
  )
}

export function PropertyPanel({
  block,
  onChange,
  onDelete,
  onReorderUp,
  onReorderDown,
}: PropertyPanelProps) {
  if (block === null) {
    return (
      <aside className="flex min-h-64 flex-col justify-center rounded-xl border bg-card p-4 text-card-foreground shadow">
        <p className="text-sm text-muted-foreground">Select a block to edit</p>
      </aside>
    )
  }

  return (
    <PropertyPanelBody
      block={block}
      onChange={onChange}
      onDelete={onDelete}
      onReorderUp={onReorderUp}
      onReorderDown={onReorderDown}
    />
  )
}

function PropertyPanelBody({
  block,
  onChange,
  onDelete,
  onReorderUp,
  onReorderDown,
}: PropertyPanelBodyProps) {
  const selectedFontFamily = familyFromFontId(block.fontId)
  const hasOutline = block.outline.enabled
  const hasShadow = block.shadow.enabled
  const hasBackdrop = block.backdrop.enabled

  return (
    <aside className="flex max-h-[calc(100vh-10rem)] min-h-64 flex-col gap-4 overflow-y-auto rounded-xl border bg-card p-4 text-card-foreground shadow">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Properties
        </p>
        <h2 className="font-clash text-2xl font-bold uppercase leading-none">
          Text block
        </h2>
      </div>

      <PanelSection title="Content">
        <div className="space-y-2">
          <Label htmlFor="block-text">Text</Label>
          <Textarea
            id="block-text"
            value={block.text}
            maxLength={500}
            rows={5}
            onChange={(event) =>
              onChange({ ...block, text: event.target.value })
            }
          />
          <p className="text-right text-xs text-muted-foreground">
            {block.text.length} / 500
          </p>
        </div>
      </PanelSection>

      <PanelSection title="Position">
        <SnapGrid
          xPct={block.xPct}
          yPct={block.yPct}
          onSnap={(xPct, yPct) => onChange({ ...block, xPct, yPct })}
        />
      </PanelSection>

      <PanelSection title="Font">
        <div className="space-y-2">
          <Label htmlFor="font-family">Font family</Label>
          <Select
            value={selectedFontFamily}
            onValueChange={(family) =>
              onChange({ ...block, fontId: fontIdFromFamily(family) })
            }
          >
            <SelectTrigger id="font-family">
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              {FONTS.map((font) => (
                <SelectItem key={font.id} value={font.family}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PanelSection>

      <PanelSection title="Typography">
        <div className="space-y-4">
          <SliderControl
            id="font-size"
            label="Font size"
            min={8}
            max={400}
            value={block.fontSize}
            valueLabel={`${block.fontSize}px`}
            onValueChange={(fontSize) => onChange({ ...block, fontSize })}
          />

          <div className="space-y-2">
            <Label>Font weight</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={block.fontWeight === "normal" ? "default" : "outline"}
                onClick={() => onChange({ ...block, fontWeight: "normal" })}
              >
                Normal
              </Button>
              <Button
                type="button"
                variant={block.fontWeight === "bold" ? "default" : "outline"}
                onClick={() => onChange({ ...block, fontWeight: "bold" })}
              >
                Bold
              </Button>
            </div>
          </div>

          <SwitchRow
            id="italic"
            label="Italic"
            checked={block.italic}
            onCheckedChange={(italic) => onChange({ ...block, italic })}
          />

          <div className="space-y-2">
            <Label>Alignment</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["left", "center", "right"] as const).map((alignment) => (
                <Button
                  key={alignment}
                  type="button"
                  variant={
                    block.alignment === alignment ? "default" : "outline"
                  }
                  onClick={() => onChange({ ...block, alignment })}
                >
                  {alignment === "left"
                    ? "L"
                    : alignment === "center"
                      ? "C"
                      : "R"}
                </Button>
              ))}
            </div>
          </div>

          <SliderControl
            id="line-height"
            label="Line height"
            min={0.5}
            max={3}
            step={0.1}
            value={block.lineHeight}
            valueLabel={formatDecimal(block.lineHeight)}
            onValueChange={(lineHeight) => onChange({ ...block, lineHeight })}
          />
          <SliderControl
            id="letter-spacing"
            label="Letter spacing"
            min={-10}
            max={50}
            value={block.letterSpacing}
            valueLabel={`${block.letterSpacing}px`}
            onValueChange={(letterSpacing) =>
              onChange({ ...block, letterSpacing })
            }
          />
          <SliderControl
            id="max-width"
            label="Max width"
            min={5}
            max={100}
            value={block.maxWidthPct}
            valueLabel={`${block.maxWidthPct}%`}
            onValueChange={(maxWidthPct) => onChange({ ...block, maxWidthPct })}
          />
        </div>
      </PanelSection>

      <PanelSection title="Color">
        <div className="space-y-3">
          <ColorControl
            id="text-color"
            label="Text color"
            value={block.color}
            onChange={(color) => onChange({ ...block, color })}
          />
          <SwitchRow
            id="auto-inverse"
            label="Invert"
            checked={block.autoInverse}
            onCheckedChange={(autoInverse) =>
              onChange({ ...block, autoInverse })
            }
          />
        </div>
      </PanelSection>

      <PanelSection title="Outline effect">
        <div className="space-y-3">
          <SwitchRow
            id="outline-enabled"
            label="Enable outline"
            checked={hasOutline}
            onCheckedChange={(enabled) =>
              onChange({
                ...block,
                outline: { ...block.outline, enabled },
                shadow: { ...block.shadow, enabled: false },
                backdrop: { ...block.backdrop, enabled: false },
              })
            }
          />
          {hasOutline ? (
            <>
              <ColorControl
                id="outline-color"
                label="Outline color"
                value={block.outline.color}
                onChange={(color) =>
                  onChange({
                    ...block,
                    outline: { ...block.outline, color, enabled: true },
                    shadow: { ...block.shadow, enabled: false },
                    backdrop: { ...block.backdrop, enabled: false },
                  })
                }
              />
              <SliderControl
                id="outline-width"
                label="Outline width"
                min={0}
                max={20}
                value={block.outline.width}
                valueLabel={`${block.outline.width}px`}
                onValueChange={(width) =>
                  onChange({
                    ...block,
                    outline: { ...block.outline, width, enabled: true },
                    shadow: { ...block.shadow, enabled: false },
                    backdrop: { ...block.backdrop, enabled: false },
                  })
                }
              />
            </>
          ) : null}
        </div>
      </PanelSection>

      <PanelSection title="Shadow effect">
        <div className="space-y-3">
          <SwitchRow
            id="shadow-enabled"
            label="Enable shadow"
            checked={hasShadow}
            onCheckedChange={(enabled) =>
              onChange({
                ...block,
                outline: { ...block.outline, enabled: false },
                shadow: { ...block.shadow, enabled },
                backdrop: { ...block.backdrop, enabled: false },
              })
            }
          />
          {hasShadow ? (
            <>
              <ColorControl
                id="shadow-color"
                label="Shadow color"
                value={block.shadow.color}
                onChange={(color) =>
                  onChange({
                    ...block,
                    outline: { ...block.outline, enabled: false },
                    shadow: { ...block.shadow, color, enabled: true },
                    backdrop: { ...block.backdrop, enabled: false },
                  })
                }
              />
              <SliderControl
                id="shadow-offset-x"
                label="Offset X"
                min={-50}
                max={50}
                value={block.shadow.offsetX}
                valueLabel={`${block.shadow.offsetX}px`}
                onValueChange={(offsetX) =>
                  onChange({
                    ...block,
                    outline: { ...block.outline, enabled: false },
                    shadow: { ...block.shadow, offsetX, enabled: true },
                    backdrop: { ...block.backdrop, enabled: false },
                  })
                }
              />
              <SliderControl
                id="shadow-offset-y"
                label="Offset Y"
                min={-50}
                max={50}
                value={block.shadow.offsetY}
                valueLabel={`${block.shadow.offsetY}px`}
                onValueChange={(offsetY) =>
                  onChange({
                    ...block,
                    outline: { ...block.outline, enabled: false },
                    shadow: { ...block.shadow, offsetY, enabled: true },
                    backdrop: { ...block.backdrop, enabled: false },
                  })
                }
              />
              <SliderControl
                id="shadow-blur"
                label="Blur"
                min={0}
                max={100}
                value={block.shadow.blur}
                valueLabel={`${block.shadow.blur}px`}
                onValueChange={(blur) =>
                  onChange({
                    ...block,
                    outline: { ...block.outline, enabled: false },
                    shadow: { ...block.shadow, blur, enabled: true },
                    backdrop: { ...block.backdrop, enabled: false },
                  })
                }
              />
            </>
          ) : null}
        </div>
      </PanelSection>

      <PanelSection title="Backdrop band">
        <div className="space-y-3">
          <SwitchRow
            id="backdrop-enabled"
            label="Enable backdrop"
            checked={hasBackdrop}
            onCheckedChange={(enabled) =>
              onChange({
                ...block,
                outline: { ...block.outline, enabled: false },
                shadow: { ...block.shadow, enabled: false },
                backdrop: { ...block.backdrop, enabled },
              })
            }
          />
          {hasBackdrop ? (
            <>
              <ColorControl
                id="backdrop-color"
                label="Backdrop color"
                value={block.backdrop.color}
                onChange={(color) =>
                  onChange({
                    ...block,
                    outline: { ...block.outline, enabled: false },
                    shadow: { ...block.shadow, enabled: false },
                    backdrop: { ...block.backdrop, color, enabled: true },
                  })
                }
              />
              <SliderControl
                id="backdrop-opacity"
                label="Opacity"
                min={0}
                max={1}
                step={0.01}
                value={block.backdrop.opacity}
                valueLabel={formatDecimal(block.backdrop.opacity, 2)}
                onValueChange={(opacity) =>
                  onChange({
                    ...block,
                    outline: { ...block.outline, enabled: false },
                    shadow: { ...block.shadow, enabled: false },
                    backdrop: { ...block.backdrop, opacity, enabled: true },
                  })
                }
              />
              <SliderControl
                id="backdrop-padding"
                label="Padding"
                min={0}
                max={100}
                value={block.backdrop.padding}
                valueLabel={`${block.backdrop.padding}px`}
                onValueChange={(padding) =>
                  onChange({
                    ...block,
                    outline: { ...block.outline, enabled: false },
                    shadow: { ...block.shadow, enabled: false },
                    backdrop: { ...block.backdrop, padding, enabled: true },
                  })
                }
              />
            </>
          ) : null}
        </div>
      </PanelSection>

      <PanelSection title="Blur behind">
        <div className="space-y-3">
          <SwitchRow
            id="blur-behind-enabled"
            label="Enable blur behind"
            checked={block.blurBehind.enabled}
            onCheckedChange={(enabled) =>
              onChange({
                ...block,
                blurBehind: { ...block.blurBehind, enabled },
              })
            }
          />
          {block.blurBehind.enabled ? (
            <SliderControl
              id="blur-behind-radius"
              label="Radius"
              min={0}
              max={50}
              value={block.blurBehind.radius}
              valueLabel={`${block.blurBehind.radius}px`}
              onValueChange={(radius) =>
                onChange({
                  ...block,
                  blurBehind: { ...block.blurBehind, radius, enabled: true },
                })
              }
            />
          ) : null}
        </div>
      </PanelSection>

      <PanelSection title="Block actions">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={onReorderUp}>
            Move Up
          </Button>
          <Button type="button" variant="secondary" onClick={onReorderDown}>
            Move Down
          </Button>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="destructive" className="w-full">
              Delete block
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete text block?</DialogTitle>
              <DialogDescription>
                This removes the selected text block from the remix canvas.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button type="button" variant="destructive" onClick={onDelete}>
                  Delete
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PanelSection>
    </aside>
  )
}
