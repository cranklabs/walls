import { redirect } from "next/navigation"

import { getSession } from "@/server/auth"
import { isGuestViewingAllowed } from "@/server/db/queries"

/**
 * Checks if the current request should be allowed to proceed based on
 * the guest viewing setting. If guest viewing is disabled and the user
 * is not authenticated, redirects to the sign-in page.
 *
 * Returns the session (or null if guest access is allowed and user is not signed in).
 */
export async function ensureGuestAccessOrAuth() {
  const session = await getSession()
  if (session) return session

  const guestAllowed = await isGuestViewingAllowed()
  if (!guestAllowed) {
    redirect("/signin")
  }

  return null
}

/**
 * Same check but for API routes - returns a boolean instead of redirecting.
 */
export async function canAccessAsGuest(): Promise<boolean> {
  const session = await getSession()
  if (session) return true

  return await isGuestViewingAllowed()
}
