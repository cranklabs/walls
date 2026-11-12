"use client"

import { useTheme } from "next-themes"
import { toast } from "sonner"

import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

export function DarkModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="font-semibold">Dark Mode</div>
          <div className="text-sm text-neutral-400">{`You know what dark mode is.`}</div>
        </div>
        <Switch
          checked={resolvedTheme === "dark"}
          onCheckedChange={(checked) => {
            setTheme(checked ? "dark" : "light")
            toast.success(`Theme changed to ${checked ? "Dark" : "Light"}`)
          }}
        />
      </div>
    </Card>
  )
}
