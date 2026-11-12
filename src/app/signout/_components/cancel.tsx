"use client"

import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

export function CancelAndGoBack() {
  const router = useRouter()

  return (
    <Button
      variant="secondary"
      className="w-full"
      onClick={() => {
        router.back()
      }}
    >
      Cancel
    </Button>
  )
}
