'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Mail, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { client } from '@/lib/orpc';

const PERKS = [
  {
    icon: BookOpen,
    title: 'EIP Digest',
    description: 'Summaries of newly proposed, reviewed, and finalised Ethereum Improvement Proposals every week.',
  },
  {
    icon: Zap,
    title: 'Governance Signals',
    description: 'Core dev call recaps, upgrade timelines, and protocol governance analysis.',
  },
  {
    icon: Clock,
    title: 'Research Highlights',
    description: 'Technical deep-dives and papers on Ethereum standards curated by our editors.',
  },
  {
    icon: CheckCircle2,
    title: 'Community Pulse',
    description: 'Contributor milestones, ecosystem events, and platform news - no spam.',
  },
];

type AvatarUser = { id: string; name: string; image: string };

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [avatars, setAvatars] = useState<AvatarUser[]>([]);

  useEffect(() => {
    client.account.getRecentAvatars({ limit: 8 })
      .then((users) => setAvatars(users.filter((u) => !!u.image).slice(0, 8)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      // TODO: wire to real newsletter API
      await new Promise((r) => setTimeout(r, 900));
      setDone(true);
      toast.success("You're on the list! Check your inbox for a confirmation.");
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-56px)] flex-col lg:flex-row">

      {/* ── Left: brand panel ── */}
      <div className="persona-gradient-soft flex flex-col justify-between border-b border-border px-6 py-10 lg:w-1/2 lg:border-b-0 lg:border-r lg:px-12 lg:py-16">
        <div>
          <Link
            href="/resources"
            className="mb-10 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Resources
          </Link>

          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Mail className="h-3.5 w-3.5" />
            Newsletter
          </div>

          <h1 className="dec-title persona-title mt-4 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            The EIPsInsight<br className="hidden lg:block" /> Journal
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Ethereum protocol upgrades, governance decisions, and EIP analysis —
            delivered to your inbox every Monday.
          </p>
        </div>

        {/* Perks */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-auto lg:pt-12">
          {PERKS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background/60">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Frequency note */}
        <div className="mt-8 flex items-start gap-2.5 rounded-xl border border-border bg-background/40 p-4">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Weekly on Mondays.</span>{' '}
            No ads, no tracking pixels, no partner emails. Unsubscribe with one click.
          </p>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex flex-col items-center justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {done ? (
            /* Success state */
            <div className="flex flex-col items-center gap-5 rounded-xl border border-border bg-card/60 p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="dec-title text-xl font-semibold text-foreground">You&apos;re subscribed!</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Thanks for joining. We&apos;ll land in your inbox this Monday.
                </p>
              </div>
              <button
                onClick={() => { setDone(false); setEmail(''); }}
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                Subscribe another address
              </button>
            </div>
          ) : (
            /* Subscribe form */
            <div className="rounded-xl border border-border bg-card/60 p-8">
              <h2 className="dec-title text-2xl font-semibold text-foreground">
                Subscribe - it&apos;s free
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Join the readers staying ahead of Ethereum governance.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="h-9 w-full rounded-md border border-border bg-muted/60 pl-10 pr-4 text-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 w-full rounded-md persona-gradient text-xs font-semibold uppercase tracking-wider text-black shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Subscribing…' : 'Subscribe to the Journal'}
                </button>
              </form>

              <p className="mt-5 text-center text-[10px] text-muted-foreground">
                By subscribing you agree to our{' '}
                <Link href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>.
                {' '}No spam, ever.
              </p>

              {/* Social proof */}
              {avatars.length > 0 && (
                <div className="mt-6 border-t border-border/60 pt-5 flex items-center justify-center gap-3">
                  <div className="flex -space-x-2">
                    {avatars.slice(0, 6).map((u) => (
                      <div key={u.id} className="relative h-7 w-7 overflow-hidden rounded-full border-2 border-card bg-muted">
                        <Image
                          src={u.image}
                          alt={u.name}
                          fill
                          sizes="28px"
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ))}
                    {avatars.length > 6 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[9px] font-bold text-muted-foreground">
                        +{avatars.length - 6}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Join our growing community of readers
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer nav */}
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {[['Home', '/'], ['Blog', '/resources/blogs'], ['About', '/about']].map(([label, href]) => (
              <Link key={label} href={href} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                {label}
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
