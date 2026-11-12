"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requestInvite } from "@/server/actions/request-invite"

export function RequestAccessForm({
  initialEmail,
  alreadyRequested,
}: {
  initialEmail: string
  alreadyRequested: boolean
}) {
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(alreadyRequested)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const resp = await requestInvite(email)
    setLoading(false)
    if (resp.success) {
      setSubmitted(true)
    } else {
      setError(resp.message)
    }
  }

  if (submitted) {
    return (
      <div className="flex w-72 flex-col gap-3">
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-center text-sm text-green-600 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
          An access request for this email has been submitted. An administrator
          will review it.
        </div>
        <Link href="/signin">
          <Button variant="secondary" className="w-full">
            Back to sign in
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex w-72 flex-col gap-3">
      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleSubmit()
        }}
        disabled={loading}
        className="h-11"
        autoFocus={!initialEmail}
      />
      <Button
        onClick={handleSubmit}
        disabled={loading || !email.trim()}
        className="h-11"
      >
        {loading ? "Submitting..." : "Request access"}
      </Button>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      <Link href="/signin">
        <Button variant="link" className="w-full text-muted-foreground">
          Back to sign in
        </Button>
      </Link>
    </div>
  )
}
