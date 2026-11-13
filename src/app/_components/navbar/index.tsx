import Image from "next/image"
import Link from "next/link"
import {
  PiGear,
  PiGearDuotone,
  PiGithubLogo,
  PiGithubLogoDuotone,
  PiUser,
} from "react-icons/pi"

import { Button } from "@/components/ui/button"
import { env } from "@/env"
import { getSession } from "@/server/auth"

import { ThemeToggle } from "./theme-toggle"

export async function Navbar() {
  const session = await getSession()
  return (
    <nav className="flex justify-between gap-2 px-2 py-2 sm:px-4">
      <div className="flex items-center gap-1 sm:gap-2">
        <Link
          href="/?redirect=false"
          className="whitespace-nowrap rounded-md px-2 py-1 transition-colors hover:bg-secondary"
        >
          Home
        </Link>
        <Link
          href="/my-walls"
          className="whitespace-nowrap rounded-md px-2 py-1 transition-colors hover:bg-secondary"
        >
          My Walls
        </Link>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {session?.user.isAdmin ? (
          <div className="hidden whitespace-nowrap rounded-full border border-red-100 bg-red-50 px-2 text-red-300 dark:border-red-900 dark:bg-red-950 dark:text-red-700 sm:block">
            admin mode
          </div>
        ) : null}
        <Link
          href="https://github.com/guneet-xyz/walls"
          target="_blank"
          className="hidden sm:block"
        >
          <Button variant="secondary" className="group">
            <div className="relative w-4 *:scale-105">
              <PiGithubLogo className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-100 transition-opacity group-hover:opacity-0" />
              <PiGithubLogoDuotone className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <span className="text-xs text-muted-foreground">
              v{env.NEXT_PUBLIC_APP_VERSION}
            </span>
          </Button>
        </Link>
        <ThemeToggle />
        <Link href="/settings">
          <Button variant="secondary" className="group">
            <div className="relative w-2">
              <PiGear className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-100 transition-opacity group-hover:opacity-0" />
              <PiGearDuotone className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </Button>
        </Link>
        {session ? (
          <Link href={`/profile/${session.user.id}`}>
            <Button
              variant="secondary"
              aria-label={session.user.name ?? "Profile"}
            >
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? ""}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <PiUser className="sm:hidden" />
              )}
              <span className="hidden max-w-48 truncate sm:inline">
                {session.user.name}
              </span>
            </Button>
          </Link>
        ) : (
          <Link href="/signin">
            <Button variant="secondary">Log In</Button>
          </Link>
        )}
      </div>
    </nav>
  )
}
