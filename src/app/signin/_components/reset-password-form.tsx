"use client"

import { useRouter } from "next/navigation"
import { useState, type ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

const MIN_LENGTH = 8
const MAX_LENGTH = 128

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function reset() {
    setError(null)
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password.length > MAX_LENGTH) {
      setError(`Use at most ${MAX_LENGTH} characters.`)
      return
    }
    if (password !== confirmation) {
      setError("The passwords don't match.")
      return
    }

    setSubmitting(true)
    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (resetError) {
        setError(
          resetError.code === "INVALID_TOKEN"
            ? "This reset link is invalid or has expired. Request a new one."
            : (resetError.message ?? "Something went wrong. Please try again."),
        )
        setSubmitting(false)
        return
      }
      router.push("/signin/password?reset=1")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
      setSubmitting(false)
    }
  }

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (
    event,
  ) => {
    event.preventDefault()
    void reset()
  }

  return (
    <form className="flex w-72 flex-col gap-3" onSubmit={handleSubmit}>
      <Input
        type="password"
        autoComplete="new-password"
        placeholder="New password"
        aria-label="New password"
        minLength={MIN_LENGTH}
        maxLength={MAX_LENGTH}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={submitting}
        required
        className="h-11"
        autoFocus
      />
      <Input
        type="password"
        autoComplete="new-password"
        placeholder="Confirm new password"
        aria-label="Confirm new password"
        maxLength={MAX_LENGTH}
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        disabled={submitting}
        required
        className="h-11"
      />
      <Button type="submit" disabled={submitting} className="h-11">
        {submitting ? "Saving..." : "Set new password"}
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
