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
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 to-primary/5 text-sm font-semibold text-primary ring-2 ring-primary/15">
        {initials(name)}
      </div>
    );
  }
  return (
    // Plain <img> (not next/image) so no remote-domain config is needed; twimg
    // can block hotlinking without a relaxed referrer policy.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={44}
      height={44}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-primary/15"
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
          <span key={i} className="font-semibold text-primary">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function TestimonialCard({ t, index }: { t: Testimonial; index: number }) {
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: index * 0.09, ease: [0.21, 0.5, 0.35, 1] }}
      whileHover={{ y: -4 }}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/60 p-5',
        'shadow-sm transition-colors duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5'
      )}
    >
      {/* Accent wash that fades in on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
      {/* Oversized decorative quote mark */}
      <Quote
        aria-hidden
        className="pointer-events-none absolute -right-2 -top-2 h-16 w-16 rotate-180 text-primary/[0.06] transition-colors duration-300 group-hover:text-primary/[0.12]"
      />

      <Quote className="relative h-5 w-5 text-primary/50" />
      <p className="relative mt-3 flex-1 text-[15px] leading-relaxed text-foreground">
        <QuoteText text={t.quote} />
      </p>

      <div className="relative mt-5 flex items-center gap-3 border-t border-border/50 pt-4">
        <Avatar name={t.name} src={t.avatar} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-foreground">{t.name}</span>
            {t.badge && (
              <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {t.badge}
              </span>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            @{t.handle}
            {t.role ? ` · ${t.role}` : ''}
            {t.date ? ` · ${t.date}` : ''}
          </div>
        </div>
        {t.url && (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
        )}
      </div>
    </motion.div>
  );

  if (!t.url) return card;
  return (
    <a href={t.url} target="_blank" rel="noopener noreferrer" className="block h-full">
      {card}
    </a>
  );
}

type Props = {
  /** Override the default list (all testimonials). */
  testimonials?: Testimonial[];
  /** Cap the number shown (e.g. featured strip on the home page). */
  limit?: number;
  /** Only show entries marked `featured`. */
  featuredOnly?: boolean;
  heading?: string;
  subtitle?: string;
  /** Show a "See all" link to the dedicated page. */
  showViewAll?: boolean;
  /** Show the small "Community love" eyebrow pill above the heading. */
  eyebrow?: boolean;
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
  className,
}: Props) {
  let list = testimonials ?? TESTIMONIALS;
  if (featuredOnly) list = list.filter((t) => t.featured);
  if (limit) list = list.slice(0, limit);
  if (list.length === 0) return null;

  const showHeader = Boolean(heading || subtitle || showViewAll || eyebrow);

  return (
    <section className={cn('w-full', className)} id="testimonials">
      {showHeader && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="mb-5 flex items-end justify-between gap-3"
        >
          <div>
            {eyebrow && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Community love
              </span>
            )}
            {heading && (
              <h2 className="dec-title persona-title text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {heading}
              </h2>
            )}
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {showViewAll && (
            <Link
              href="/testimonials"
              className="group inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              See all
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          )}
        </motion.div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t, i) => (
          <TestimonialCard key={`${t.handle}-${t.quote.slice(0, 16)}`} t={t} index={i} />
        ))}
      </div>
    </section>
  );
}
