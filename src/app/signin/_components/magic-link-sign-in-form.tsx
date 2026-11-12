"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export function MagicLinkSignInForm() {
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function sendMagicLink() {
    setError(null)
    if (!email) {
      setError("Please enter your email address.")
      return
    }

    const normalizedEmail = email.trim().toLowerCase()

    try {
      setSending(true)

      const { error: signInError } = await authClient.signIn.magicLink({
        email: normalizedEmail,
        callbackURL: "/",
      })

      if (signInError) {
        if (signInError.status === 403) {
          const body = signInError as { message?: string; redirectTo?: string }
          if (body.redirectTo) {
            router.push(body.redirectTo)
            return
          }
          setError(body.message ?? "Access denied.")
        } else {
          setError(
            signInError.message ?? "Something went wrong. Please try again.",
          )
        }
        setSending(false)
        return
      }

      router.push(
        `/signin/magic-link?sent=1&email=${encodeURIComponent(normalizedEmail)}`,
      )
    } catch {
      setError("Something went wrong. Please try again.")
      setSending(false)
    }
  }

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (
    event,
  ) => {
    event.preventDefault()
    void sendMagicLink()
  }

  return (
    <form className="flex w-72 flex-col gap-3" onSubmit={handleSubmit}>
      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={sending}
        required
        className="h-11"
        autoFocus
      />
      <Button type="submit" disabled={sending} className="h-11">
        {sending ? "Sending..." : "Send magic link"}
      </Button>
      <Link
        href="/signin"
        className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Use an OTP instead
      </Link>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </form>
  )
}
