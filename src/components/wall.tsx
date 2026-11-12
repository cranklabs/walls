"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { OptimizedImage } from "@/components/optimized-image"
import { cn } from "@/lib/utils"

export function Wall({
  images,
}: {
  images: { id: number; name: string; nsfw: number }[]
}) {
  const [nsfwFilter, setNsfwFilter] = useState<"none" | "mild" | "all">("none")

  function nextNsfwFilter() {
    if (nsfwFilter === "none") return "mild"
    if (nsfwFilter === "mild") return "all"
    return "none"
  }

  const filteredImages = useMemo(
    () =>
      images.filter((image) => {
        if (nsfwFilter === "none") return image.nsfw === 0
        if (nsfwFilter === "mild") return image.nsfw !== 2
        return true
      }),
    [images, nsfwFilter],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="ml-auto flex items-center gap-2">
        <div className="text-sm font-semibold">NSFW</div>
        <div
          className="relative h-8 w-16 cursor-pointer select-none overflow-hidden rounded-md bg-neutral-100 px-2 py-1 text-center text-xs uppercase dark:bg-neutral-900"
          onClick={() => {
            setNsfwFilter(nextNsfwFilter())
          }}
        >
          <div
            className={cn(
              "absolute left-1/2 flex -translate-x-1/2 flex-col gap-4 font-semibold transition-all",
              {
                "top-2": nsfwFilter === "none",
                "-top-6": nsfwFilter === "mild",
                "-top-14": nsfwFilter === "all",
              },
            )}
          >
            <div className="text-neutral-500">NONE</div>
            <div className="text-amber-500">MILD</div>
            <div className="text-rose-500">ALL</div>
          </div>
        </div>
      </div>

      <div className="columns-3xs gap-4">
        {filteredImages.map((image) => (
          <Link key={image.id} href={`/walls/${image.id}`} className="">
            <OptimizedImage
              name={image.name}
              width={400}
              height={400}
              className="mb-4 w-full rounded-lg transition-transform hover:scale-105"
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
