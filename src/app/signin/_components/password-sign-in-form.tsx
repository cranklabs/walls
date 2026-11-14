"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export function PasswordSignInForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function signIn() {
    setError(null)
    setSubmitting(true)
    try {
      const { error: signInError } = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInError) {
        if (signInError.status === 429) {
          setError("Too many attempts. Wait a few seconds and try again.")
        } else if (signInError.status === 401) {
          setError(
            "Incorrect email or password. No password yet? Sign in with a one-time code and add one in Settings.",
          )
        } else {
          setError(
            signInError.message ?? "Something went wrong. Please try again.",
          )
        }
        setSubmitting(false)
        return
      }
      router.push("/")
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
    void signIn()
  }

  const forgotHref = email.trim()
    ? `/signin/forgot-password?email=${encodeURIComponent(email.trim())}`
    : "/signin/forgot-password"

  return (
    <form className="flex w-72 flex-col gap-3" onSubmit={handleSubmit}>
      <Input
        type="email"
        name="email"
        autoComplete="username"
        placeholder="you@example.com"
        aria-label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={submitting}
        required
        className="h-11"
        autoFocus={!initialEmail}
      />
      <Input
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="Password"
        aria-label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={submitting}
        required
        className="h-11"
        autoFocus={Boolean(initialEmail)}
      />
      <Button type="submit" disabled={submitting} className="h-11">
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-between gap-2 text-xs text-muted-foreground">
        <Link href={forgotHref} className="underline-offset-4 hover:underline">
          Forgot password?
        </Link>
        <Link href="/signin" className="underline-offset-4 hover:underline">
          Use a one-time code
        </Link>
      </div>
    </form>
  )
}
