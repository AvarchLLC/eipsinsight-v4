import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Heart } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { TestimonialsSection } from '@/components/testimonials-section';
import { TESTIMONIALS } from '@/data/testimonials';

export const metadata: Metadata = buildMetadata({
  title: 'Testimonials',
  description:
    'What builders, editors, and researchers across Ethereum say about EIPsInsight.',
  path: '/testimonials',
  image: null,
});

export default function TestimonialsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-16 pt-8 sm:px-6">
      <header className="border-b border-border/40 pb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Heart className="h-3.5 w-3.5" /> Community
        </span>
        <h1 className="dec-title persona-title mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Loved by the Ethereum community
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Kind words from builders, editors, authors, and researchers who use
          EIPsInsight to follow EIPs, ERCs, RIPs, and network upgrades. Want to
          add yours? Tag{' '}
          <a
            href="https://x.com/EIPsInsight"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            @EIPsInsight
          </a>{' '}
          on X.
        </p>
      </header>

      <TestimonialsSection heading="" subtitle="" />

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/60 px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {TESTIMONIALS.length} shoutouts and counting.
        </p>
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          Explore EIPsInsight
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
