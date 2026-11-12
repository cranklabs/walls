"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { authClient } from "@/lib/auth-client"

export function VerifyOtpForm({ email }: { email: string }) {
  const [otp, setOtp] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function verifyOtp() {
    setError(null)
    setSubmitting(true)

    const { error: signInError } = await authClient.signIn.emailOtp({
      email,
      otp,
    })

    if (signInError) {
      setError(signInError.message ?? "Invalid code. Please try again.")
      setSubmitting(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (
    event,
  ) => {
    event.preventDefault()
    void verifyOtp()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
      <InputOTP
        maxLength={6}
        value={otp}
        onChange={setOtp}
        disabled={submitting}
        autoFocus
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      <Button className="h-11 w-full" disabled={submitting || otp.length < 6}>
        {submitting ? "Verifying..." : "Verify OTP"}
      </Button>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      <Link
        href="/signin"
        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Use a different email
      </Link>
    </form>
  )
}
