"use client"

import Link from "next/link"
import { useState, type ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function requestReset() {
    setError(null)
    const normalizedEmail = email.trim().toLowerCase()
    setSubmitting(true)
    try {
      const { error: resetError } = await authClient.requestPasswordReset({
        email: normalizedEmail,
        redirectTo: "/signin/reset-password",
      })
      if (resetError) {
        setError(
          resetError.status === 429
            ? "Too many requests. Wait a little and try again."
            : (resetError.message ?? "Something went wrong. Please try again."),
        )
        return
      }
      setSentTo(normalizedEmail)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (
    event,
  ) => {
    event.preventDefault()
    void requestReset()
  }

  if (sentTo) {
    return (
      <div className="flex w-72 flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          If a Walls account uses this email, we&apos;ve sent it a link to set a
          new password. The link expires in one hour.
        </p>
        <p className="break-all text-xs text-muted-foreground/70">{sentTo}</p>
        <p className="text-xs text-muted-foreground/70">
          {`If you don't see it, check your spam folder.`}
        </p>
        <Link
          href="/signin/password"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form className="flex w-72 flex-col gap-3" onSubmit={handleSubmit}>
      <Input
        type="email"
        autoComplete="username"
        placeholder="you@example.com"
        aria-label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={submitting}
        required
        className="h-11"
        autoFocus
      />
      <Button type="submit" disabled={submitting} className="h-11">
        {submitting ? "Sending..." : "Send reset link"}
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
      <Link
        href="/signin/password"
        className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </form>
  )
}
