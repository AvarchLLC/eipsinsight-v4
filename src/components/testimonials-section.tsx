'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, Quote, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TESTIMONIALS, type Testimonial } from '@/data/testimonials';

/** Deterministic initials for the avatar fallback. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function Avatar({ name, src }: { name: string; src?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-sans font-bold text-[var(--ink)] ring-1 ring-[var(--border)]">
        {initials(name)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={40}
      height={40}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[var(--border)]"
    />
  );
}

/** Render a quote, emphasizing @handles in the brand color. */
function QuoteText({ text }: { text: string }) {
  const parts = text.split(/(@[A-Za-z0-9_]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="font-semibold text-[var(--brand-strong)]">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function TestimonialCard({
  t,
  index,
  isWide = false,
}: {
  t: Testimonial;
  index: number;
  isWide?: boolean;
}) {
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.21, 0.5, 0.35, 1] }}
      whileHover={{ y: -3 }}
      className={cn(
        'group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all duration-200 hover:border-[var(--brand)]/50 hover:bg-[var(--surface-2)] hover:shadow-lg hover:shadow-[var(--brand)]/5',
        isWide ? 'lg:col-span-2 md:col-span-2' : 'col-span-1'
      )}
    >
      {/* Subtle accent wash that fades in on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--brand-muted)] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {/* Oversized faint decorative quote watermark */}
      <Quote
        aria-hidden
        className="pointer-events-none absolute -right-2 -top-2 h-16 w-16 rotate-180 text-[var(--ink)]/5 transition-colors duration-300 group-hover:text-[var(--brand)]/10"
      />

      <div className="relative z-10 flex-1">
        <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand-muted)] text-[var(--brand-strong)] transition-transform duration-200 group-hover:scale-105">
          <Quote className="h-3.5 w-3.5" />
        </div>
        <p
          className={cn(
            'leading-relaxed text-[var(--ink)] font-sans',
            isWide ? 'text-sm sm:text-base font-medium' : 'text-sm'
          )}
        >
          <QuoteText text={t.quote} />
        </p>
      </div>

      <div className="relative z-10 mt-5 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={t.name} src={t.avatar} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-semibold font-sans text-[var(--ink)] group-hover:text-[var(--brand-strong)] transition-colors">
                {t.name}
              </span>
              {t.badge && (
                <span className="shrink-0 rounded-full border border-[var(--brand)]/30 bg-[var(--brand-muted)] px-2 py-0.5 text-[10px] font-sans font-semibold text-[var(--brand-strong)]">
                  {t.badge}
                </span>
              )}
            </div>
            <div className="truncate text-xs text-[var(--ink-muted)] font-sans">
              <span className="font-mono text-[var(--ink-faint)]">@{t.handle}</span>
              {t.role ? ` · ${t.role}` : ''}
              {t.date ? ` · ${t.date}` : ''}
            </div>
          </div>
        </div>
        {t.url && (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--ink-faint)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--brand-strong)]" />
        )}
      </div>
    </motion.div>
  );

  if (!t.url) return card;
  return (
    <a href={t.url} target="_blank" rel="noopener noreferrer" className={cn('block h-full', isWide ? 'lg:col-span-2 md:col-span-2' : 'col-span-1')}>
      {card}
    </a>
  );
}

type Props = {
  /** Override the default list (all testimonials). */
  testimonials?: Testimonial[];
  /** Cap the number shown. */
  limit?: number;
  /** Only show entries marked `featured`. */
  featuredOnly?: boolean;
  heading?: string;
  subtitle?: string;
  /** Show a "See all" link to the dedicated page. */
  showViewAll?: boolean;
  /** Show the small "Community love" eyebrow pill above the heading. */
  eyebrow?: boolean;
  /** Explicit control over showing the component's internal header. */
  showHeader?: boolean;
  className?: string;
};

export function TestimonialsSection({
  testimonials,
  limit,
  featuredOnly = false,
  heading = 'Loved by the community',
  subtitle = 'What builders, editors, and researchers say about EIPsInsight.',
  showViewAll = false,
  eyebrow = false,
  showHeader,
  className,
}: Props) {
  let list = testimonials ?? TESTIMONIALS;
  if (featuredOnly) list = list.filter((t) => t.featured);
  if (limit) list = list.slice(0, limit);
  if (list.length === 0) return null;

  const shouldRenderHeader = showHeader ?? Boolean((heading && heading.length > 0) || (subtitle && subtitle.length > 0) || showViewAll || eyebrow);

  // Bento layout mapping for 7 items:
  // Row 1: Item 0 (wide, 2 cols) + Item 1 (1 col) = 3 cols
  // Row 2: Item 2 (1 col) + Item 3 (wide, 2 cols) = 3 cols
  // Row 3: Item 4 (1 col) + Item 5 (1 col) + Item 6 (1 col) = 3 cols
  const wideIndices = new Set([0, 3]);

  return (
    <div className={cn('w-full', className)}>
      {shouldRenderHeader && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="mb-5 flex items-end justify-between gap-3"
        >
          <div>
            {eyebrow && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--brand)]/30 bg-[var(--brand-muted)] px-2.5 py-1 text-[11px] font-sans font-semibold uppercase tracking-wider text-[var(--brand-strong)]">
                <Sparkles className="h-3.5 w-3.5" /> Community love
              </span>
            )}
            {heading && (
              <h2 className="dec-title persona-title text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                {heading}
              </h2>
            )}
            {subtitle && <p className="mt-1 text-sm text-[var(--ink-muted)] font-sans">{subtitle}</p>}
          </div>
          {showViewAll && (
            <Link
              href="/testimonials"
              className="btn btn-outline h-8 px-3 text-xs font-sans font-medium inline-flex items-center gap-1.5 hover:border-[var(--ink)]"
            >
              <span>See all</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
            </Link>
          )}
        </motion.div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {list.map((t, i) => (
          <TestimonialCard
            key={`${t.handle}-${t.quote.slice(0, 16)}`}
            t={t}
            index={i}
            isWide={wideIndices.has(i)}
          />
        ))}
      </div>
    </div>
  );
}
