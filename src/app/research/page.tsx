import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FlaskConical } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Research | EIPsInsight',
  description:
    'Original EIPsInsight research: deep dives on Ethereum protocol changes, run on our own nodes and indexers. Differential replays, gas audits, and measured on-chain impact.',
};

export const revalidate = 3600;

// Curated list of EIPsInsight research write-ups. Newest first.
type Article = {
  slug: string;
  title: string;
  dek: string;
  tags: string[];
  date: string;
  thumb: string;
};

const ARTICLES: Article[] = [
  {
    slug: 'glamsterdam',
    title: 'What Glamsterdam breaks',
    dek: "EIP-8037/8038 reprice on-chain storage. A differential replay of real mainnet transactions finds ERC-4337 account abstraction hard-breaks at verificationGasLimit, the class the professional audits missed.",
    tags: ['Glamsterdam', 'EIP-8037/8038', 'Account Abstraction'],
    date: 'November 2026',
    thumb: '/research/glamsterdam.svg',
  },
];

export default function ResearchIndexPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-primary">
        <FlaskConical className="h-3.5 w-3.5" /> EIPsInsight Research
      </div>
      <h1 className="dec-title mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Research</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Original deep dives on Ethereum protocol changes, run on our own archive nodes and indexers. Differential replays,
        gas audits, and measured on-chain impact, with every number reproducible.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ARTICLES.map((a) => (
          <Link
            key={a.slug}
            href={`/research/${a.slug}`}
            className="group overflow-hidden rounded-xl border border-border bg-card/50 transition-colors hover:border-primary/40"
          >
            <div className="aspect-[16/9] w-full overflow-hidden border-b border-border/60 bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.thumb} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-1.5">
                {a.tags.map((t) => (
                  <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary border border-primary/20">{t}</span>
                ))}
              </div>
              <h2 className="dec-title mt-3 text-lg font-semibold tracking-tight text-foreground">{a.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a.dek}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{a.date}</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Read <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
