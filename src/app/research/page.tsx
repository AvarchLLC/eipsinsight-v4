import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHead } from "@/components/ledger/page-head";
import { SectionHead } from "@/components/ledger/section-head";

export const metadata: Metadata = {
  title: "Research | EIPsInsight",
  description:
    "Original EIPsInsight research: deep dives on Ethereum protocol changes, run on our own nodes and indexers. Differential replays, gas audits, and measured on-chain impact.",
};

export const revalidate = 3600;

// Curated list of EIPsInsight research write-ups. Newest first.
// `metric` is the finding's headline data, shown as the card's visual (data as
// decoration), so the thumbnail never duplicates the title.
type Article = {
  slug: string;
  title: string;
  dek: string;
  tags: string[];
  date: string;
  metric: {
    eyebrow: string;
    unit: string;
    bars: { label: string; value: number }[];
    max: number;
  };
};

const ARTICLES: Article[] = [
  {
    slug: "glamsterdam",
    title: "What Glamsterdam reprices",
    dek: "EIP-8037/8038 reprice on-chain storage gas. On our own archive node, ~99,000 plain ETH transfers a day go to new accounts that would fail under the new rules. A scan of the 300 busiest contracts flags 115 more candidates to re-check.",
    tags: ["Glamsterdam", "EIP-8037/8038", "Gas repricing"],
    date: "November 2026",
    metric: {
      eyebrow: "Flagged by invariant",
      unit: "",
      max: 115,
      bars: [
        { label: "INV-1 failed call", value: 96 },
        { label: "INV-3 gas returned", value: 73 },
        { label: "INV-7 fixed reserves", value: 32 },
      ],
    },
  },
];

export default function ResearchIndexPage() {
  return (
    <div data-ledger className="min-h-screen">
      <PageHead
        eyebrow="EIPsInsight research"
        title={<>Research</>}
        lead={
          <>
            Original deep dives on Ethereum protocol changes, run on our own archive nodes and indexers. Differential
            replays, gas audits, and <span className="accent">measured on-chain impact</span>, with every number
            reproducible.
          </>
        }
      />

      <div className="wrap py-8 sm:py-10">
        <section>
          <SectionHead
            index="01"
            eyebrow="Published"
            title="On-chain impact"
            description="How upcoming protocol changes land on real contracts, scanned and measured against mainnet."
          />

          <div className="space-y-5">
            {ARTICLES.map((a) => (
              <Link
                key={a.slug}
                href={`/research/${a.slug}`}
                className="tile group flex flex-col overflow-hidden sm:flex-row"
              >
                <div className="flex w-full shrink-0 flex-col justify-center gap-4 border-b border-[var(--border)] bg-[var(--surface-2)] p-6 sm:w-[300px] sm:border-b-0 sm:border-r lg:w-[380px]">
                  <div className="flex items-baseline justify-between">
                    <span className="eyebrow">{a.metric.eyebrow}</span>
                    <span className="eyebrow text-[var(--brand-strong)]">scan</span>
                  </div>
                  <div className="space-y-2.5">
                    {a.metric.bars.map((b) => (
                      <div key={b.label} className="flex items-center gap-3">
                        <span className="mono w-[8.5rem] shrink-0 truncate text-right text-[0.72rem] text-[var(--ink-faint)]">
                          {b.label}
                        </span>
                        <span className="h-[0.9rem] flex-1 overflow-hidden rounded-[2px] bg-[var(--surface-3)]">
                          <span
                            className="block h-full rounded-[2px] bg-[var(--brand)]"
                            style={{ width: `${(b.value / a.metric.max) * 100}%` }}
                          />
                        </span>
                        <span className="mono w-9 shrink-0 text-[0.72rem] font-semibold tabular-nums text-[var(--ink)]">
                          {b.value}
                          {a.metric.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-center p-6 sm:p-8">
                  <div className="flex flex-wrap gap-1.5">
                    {a.tags.map((t) => (
                      <span key={t} className="eyebrow rounded border border-[var(--border)] px-2 py-1">
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="t-h2 mt-4">{a.title}</h3>
                  <p className="mt-2 max-w-[52rem] text-[1.02rem] leading-relaxed text-[var(--ink-muted)]">{a.dek}</p>
                  <div className="mt-5 flex items-center gap-4">
                    <span className="eyebrow">{a.date}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-strong)]">
                      Read the research <ArrowRight className="tile-arrow h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
