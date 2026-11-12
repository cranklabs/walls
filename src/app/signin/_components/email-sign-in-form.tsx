"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export function OtpSignInForm() {
  const [email, setEmail] = useState("")
  const [sendingOtp, setSendingOtp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function sendOtp() {
    setError(null)
    if (!email) {
      setError("Please enter your email address.")
      return
    }

    const normalizedEmail = email.trim().toLowerCase()

    try {
      setSendingOtp(true)

      const { error: signInError } =
        await authClient.emailOtp.sendVerificationOtp({
          email: normalizedEmail,
          type: "sign-in",
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
        setSendingOtp(false)
        return
      }

      router.push(`/signin/otp?email=${encodeURIComponent(normalizedEmail)}`)
    } catch {
      setError("Something went wrong. Please try again.")
      setSendingOtp(false)
    }
  }

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (
    event,
  ) => {
    event.preventDefault()
    void sendOtp()
  }

  return (
    <form className="flex w-72 flex-col gap-3" onSubmit={handleSubmit}>
      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={sendingOtp}
        required
        className="h-11"
        autoFocus
      />
      <Button type="submit" disabled={sendingOtp} className="h-11">
        {sendingOtp ? "Sending..." : "Send OTP"}
      </Button>
      <Link
        href="/signin/magic-link"
        className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Use a magic link instead
      </Link>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </form>
  )
}
