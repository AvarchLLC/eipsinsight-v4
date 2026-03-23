'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { KeyRound, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function ApiTokensWaitlistPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [useCase, setUseCase] = useState('')
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          useCase,
          source: 'api_tokens',
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to join waitlist' }))
        throw new Error(body?.error || 'Failed to join waitlist')
      }

      setJoined(true)
      toast.success('You are on the API waitlist')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join waitlist'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell-narrow py-10">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-wide text-primary">
        API Access
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-lg border border-primary/25 bg-primary/10 p-2.5">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="dec-title text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              API Tokens are rolling out soon
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              We&apos;re validating demand before rolling out token access. Join the waitlist and
              tell us how you&apos;d use EIPsInsight data.
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <span className="font-semibold">Early access:</span> premium analytics benefits are currently available for everyone.
        </div>

        {joined ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground">
              You&apos;re in. We&apos;ll notify you when API token access opens.
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/analytics"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                Explore analytics
              </Link>
              <Link
                href="/whats-new"
                className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:bg-primary/5"
              >
                See what&apos;s new
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Name (optional)
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                  placeholder="Your name"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                  placeholder="you@company.com"
                />
              </label>
            </div>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Intended use (optional)
              </span>
              <textarea
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                placeholder="What would you build with EIPsInsight API data?"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Join waitlist
              </button>
              <Link
                href="/analytics"
                className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:bg-primary/5"
              >
                Continue to analytics
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
