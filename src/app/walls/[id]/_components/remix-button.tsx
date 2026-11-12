import Link from "next/link"

import { Button } from "@/components/ui/button"

export function RemixButton({ id }: { id: number }) {
  return (
    <Link href={`/walls/${id}/remix`}>
      <Button>+ Remix</Button>
    </Link>
  )
}
