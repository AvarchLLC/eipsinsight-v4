'use client'

import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    status: 'Available',
    features: ['Standards discovery', 'Analytics access', 'Explore and insights'],
  },
  {
    name: 'Pro',
    status: 'Coming soon',
    features: ['Advanced exports', 'Priority workflows', 'Expanded integrations'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    status: 'Coming soon',
    features: ['Org-level controls', 'Custom support', 'Contracted integrations'],
  },
]

export default function PricingPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />

      <div className="relative mx-auto w-full max-w-full px-3 py-12 sm:px-4 lg:px-5 xl:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-wide text-primary">
              Pricing
            </div>
            <h1 className="dec-title mt-3 text-balance text-3xl font-semibold tracking-tight leading-[1.1] text-foreground sm:text-4xl">
              Premium subscriptions are rolling out soon
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Premium analytics are currently available at no cost while we prepare full plan activation.
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              <span className="font-semibold">Early access:</span> premium insights are open for everyone right now.
              Paid plan activation will follow soon.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-5 ${
                  plan.highlighted
                    ? 'border-primary/35 bg-primary/5'
                    : 'border-border bg-card/60'
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">
                    {plan.name}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                      plan.status === 'Available'
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border border-primary/30 bg-primary/10 text-primary'
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Check className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Link
              href="/analytics"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" />
              Use premium analytics now
            </Link>
            <Link
              href="/api-tokens"
              className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:bg-primary/5"
            >
              Join API waitlist
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
