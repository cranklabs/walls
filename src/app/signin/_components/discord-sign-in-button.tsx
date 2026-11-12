"use client"

import { useState } from "react"
import { FaDiscord } from "react-icons/fa"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function DiscordSignInButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn() {
    setPending(true)
    setError(null)
    try {
      const { error: signInError } = await authClient.signIn.social({
        provider: "discord",
        callbackURL: "/",
        errorCallbackURL: "/signin",
      })
      if (signInError) {
        setError("Discord sign-in could not be started. Please try again.")
        setPending(false)
      }
    } catch {
      setError("Discord sign-in could not be started. Please try again.")
      setPending(false)
    }
  }

  return (
    <div className="flex w-72 flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        className="h-11"
        disabled={pending}
        onClick={() => void signIn()}
      >
        <FaDiscord aria-hidden="true" />
        {pending ? "Connecting to Discord..." : "Continue with Discord"}
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
