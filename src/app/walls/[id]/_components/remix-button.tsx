import Link from "next/link"

import { Button } from "@/components/ui/button"

export function RemixButton({
  id,
  className,
}: {
  id: number
  className?: string
}) {
  return (
    <Link href={`/walls/${id}/remix`} className={className}>
      <Button className="w-full">+ Remix</Button>
    </Link>
  )
}
