import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { auth, type Session } from "./config"

export { auth }
export type { Session }

/**
 * Get the current session. Cached per-request via React cache().
 */
export const getSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
})

/**
 * Ensure the user is authenticated. Redirects to /signin if not.
 * Returns a non-null session.
 */
export async function ensureAuth() {
  const session = await getSession()
  if (!session) redirect("/signin")
  return session
}
