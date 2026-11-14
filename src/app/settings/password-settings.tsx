"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ComponentProps } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { authClient } from "@/lib/auth-client"
import { setPassword } from "@/server/actions/set-password"

const MIN_LENGTH = 8
const MAX_LENGTH = 128

const CHANGE_ERRORS: Record<string, string> = {
  INVALID_PASSWORD: "Your current password is incorrect.",
  SESSION_NOT_FRESH:
    "For your security, sign out and sign in again before changing your password.",
  PASSWORD_TOO_SHORT: `Use at least ${MIN_LENGTH} characters.`,
  PASSWORD_TOO_LONG: `Use at most ${MAX_LENGTH} characters.`,
}

function validateNewPassword(password: string, confirmation: string) {
  if (password.length < MIN_LENGTH)
    return `Use at least ${MIN_LENGTH} characters.`
  if (password.length > MAX_LENGTH)
    return `Use at most ${MAX_LENGTH} characters.`
  if (password !== confirmation) return "The passwords don't match."
  return null
}

export function PasswordSettings({
  email,
  hasPassword,
}: {
  email: string
  hasPassword: boolean
}) {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [signOutOthers, setSignOutOthers] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const validationError = validateNewPassword(newPassword, confirmation)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    try {
      if (hasPassword) {
        const { error: changeError } = await authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: signOutOthers,
        })
        if (changeError) {
          setError(
            (changeError.code && CHANGE_ERRORS[changeError.code]) ??
              changeError.message ??
              "Could not change your password. Please try again.",
          )
          return
        }
        toast.success("Password changed")
      } else {
        const resp = await setPassword(newPassword)
        if (!resp.success) {
          setError(resp.message)
          return
        }
        toast.success(resp.message)
      }
      setCurrentPassword("")
      setNewPassword("")
      setConfirmation("")
      router.refresh()
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
    void submit()
  }

  return (
    <Card className="mt-4">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col">
          <div className="font-semibold">
            {hasPassword ? "Change Password" : "Add a Password"}
          </div>
          <div className="text-sm text-neutral-400">
            {hasPassword ? (
              <>
                Forgot it?{" "}
                <Link
                  href={`/signin/forgot-password?email=${encodeURIComponent(email)}`}
                  className="underline underline-offset-4"
                >
                  Reset it by email
                </Link>
                .
              </>
            ) : (
              "Sign in with your email and a password, alongside your current sign-in methods."
            )}
          </div>
        </div>
        {/* Lets password managers associate the new password with this account. */}
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={email}
          readOnly
          hidden
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {hasPassword && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={MIN_LENGTH}
              maxLength={MAX_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              maxLength={MAX_LENGTH}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
        </div>
        {hasPassword && (
          <label className="flex items-center justify-between gap-4 text-sm">
            Sign out of other devices
            <Switch
              checked={signOutOthers}
              onCheckedChange={setSignOutOthers}
              disabled={submitting}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={submitting} className="sm:self-end">
          {submitting
            ? "Saving..."
            : hasPassword
              ? "Change password"
              : "Add password"}
        </Button>
      </form>
    </Card>
  )
}
