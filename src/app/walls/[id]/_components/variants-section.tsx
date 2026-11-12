import Link from "next/link"

import { OptimizedImage } from "@/components/optimized-image"

type Descendant = {
  id: number
  name: string
  nsfw: boolean
  publicVisibility: boolean
  uploadedBy: string
}

export function VariantsSection({
  descendants,
  sessionUserId,
  isAdmin = false,
}: {
  descendants: Descendant[]
  sessionUserId?: string
  isAdmin?: boolean
}) {
  if (descendants.length === 0) return null

  const visibleDescendants = descendants.filter((descendant) => {
    const canViewRestricted = isAdmin || sessionUserId === descendant.uploadedBy

    if (descendant.nsfw && !canViewRestricted) return false
    if (!descendant.publicVisibility && !canViewRestricted) return false

    return true
  })

  if (visibleDescendants.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-clash text-2xl font-bold uppercase">Variants</h2>
      <div className="columns-3xs gap-4">
        {visibleDescendants.map((descendant) => (
          <Link key={descendant.id} href={`/walls/${descendant.id}`}>
            <OptimizedImage
              name={descendant.name}
              width={400}
              height={400}
              className="mb-4 w-full rounded-lg transition-transform hover:scale-105"
            />
          </Link>
        ))}
      </div>
    </section>
  )
}
