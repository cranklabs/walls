"use client"

import { useTheme } from "next-themes"
import { PiMoon, PiMoonDuotone, PiSun, PiSunDuotone } from "react-icons/pi"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { setTheme } = useTheme()
  return (
    <Button
      variant="secondary"
      className="group"
      onClick={() => {
        setTheme((theme) => (theme === "dark" ? "light" : "dark"))
      }}
    >
      <div className="relative w-2">
        <PiMoon
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity",
            "opacity-0 dark:opacity-100 dark:group-hover:opacity-0",
          )}
        />
        <PiMoonDuotone
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity",
            "opacity-0 dark:opacity-0 dark:group-hover:opacity-100",
          )}
        />
        <PiSun
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity",
            "opacity-100 group-hover:opacity-0 dark:opacity-0 dark:group-hover:opacity-0",
          )}
        />
        <PiSunDuotone
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity",
            "opacity-0 group-hover:opacity-100 dark:opacity-0 dark:group-hover:opacity-0",
          )}
        />
      </div>
    </Button>
  )
}
