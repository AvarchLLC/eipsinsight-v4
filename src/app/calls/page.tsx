import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import '@/lib/orpc.server';
import { buildMetadata } from '@/lib/seo';
import {
  getCachedRecentCalls,
  getCachedUpcomingCalls,
} from '@/lib/upgrade-data.server';
import { OFFICE_HOUR_RECAPS } from '@/data/office-hour-recaps';
import { CallsBrowser } from '@/components/upgrade/calls-browser';
import { PageHead } from '@/components/ledger/page-head';
import {
  getCallSeriesOverview,
  type SeriesOverviewRow,
} from '@/server/calls';
import { callSeriesShort } from '@/data/call-series';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Protocol calls',
  description:
    'AllCoreDevs and breakout calls, recapped: decisions, action items and recordings across every Ethereum core-dev call series.',
  path: '/calls',
  keywords: ['AllCoreDevs', 'ACDE', 'ACDC', 'Ethereum protocol calls'],
});

function monthDay(date: string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

function ago(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function cadence(days: number | null): string {
  if (days == null) return 'one call so far';
  if (days <= 9) return 'meets ~weekly';
  if (days <= 18) return 'meets ~biweekly';
  if (days <= 45) return 'meets ~monthly';
  return 'meets occasionally';
}

const GROUPS: { key: SeriesOverviewRow['group']; label: string; blurb: string }[] = [
  {
    key: 'core',
    label: 'All Core Devs',
    blurb: 'The standing calls where execution, consensus, and testing coordinate every upgrade.',
  },
  {
    key: 'breakout',
    label: 'Breakout calls',
    blurb: 'Focused working groups driving a single feature or EIP toward inclusion.',
  },
  {
    key: 'process',
    label: 'Governance process',
    blurb: 'How the EIP process itself is run and edited.',
  },
  {
    key: 'other',
    label: 'One-off calls',
    blurb: 'Single-topic sessions outside the regular series.',
  },
];

function SeriesCard({ s }: { s: SeriesOverviewRow }) {
  return (
    <Link
      href={`/calls?series=${s.series}`}
      className="group flex min-w-0 flex-col rounded-[var(--l-radius)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs transition-all hover:border-[var(--brand-strong)]/50 hover:bg-[var(--surface-2)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--brand-strong)] font-semibold">
            {s.short}
          </span>
          <h3 className="mt-2.5 truncate font-serif text-lg font-bold tracking-tight text-[var(--ink)] group-hover:text-[var(--brand-strong)] transition-colors">
            {s.label}
          </h3>
        </div>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-[var(--ink-faint)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--brand-strong)]" />
      </div>

      <p className="mt-1.5 font-mono text-xs text-[var(--ink-muted)]">
        {s.count} call{s.count === 1 ? '' : 's'} · {cadence(s.cadenceDays)}
        {s.lastDate && <> · last {ago(s.lastDate)}</>}
      </p>

      {s.latest?.headline ? (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <p className="mb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-faint)]">
            Latest · {s.latest.title.replace(s.label, '').trim() || `#${s.latest.number}`}
          </p>
          <p className="line-clamp-2 text-xs leading-relaxed text-[var(--ink-muted)]">
            {s.latest.headline}
          </p>
        </div>
      ) : (
        s.latest && (
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <p className="text-xs text-[var(--ink-muted)]">
              Latest call {monthDay(s.latest.date)}
              {s.latest.videoUrl ? ' · recording available' : ''}.
            </p>
          </div>
        )
      )}
    </Link>
  );
}

export default async function ProtocolCallsPage() {
  const [upcoming, recentDb, overview] = await Promise.all([
    getCachedUpcomingCalls(),
    getCachedRecentCalls(300),
    getCallSeriesOverview(),
  ]);

  const totalCalls = overview.reduce((n, s) => n + s.count, 0);

  // Combine DB recent calls with static office hour recaps if missing
  const dbKeys = new Set(recentDb.map((c) => `${c.series}-${c.call_number ?? c.call_id}`));
  const recent = [
    ...recentDb,
    ...OFFICE_HOUR_RECAPS.filter((r) => !dbKeys.has(`${r.series}-${r.meeting}`)).map((r) => ({
      series: r.series,
      call_id: r.meeting.toString(),
      call_number: r.meeting.toString(),
      display_name: r.title,
      occurred_on: r.dateISO,
      video_url: r.youtube,
      issue_number: null,
      has_transcript: true,
      tldr: r.tldr,
    })),
  ].sort((a, b) => new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime());

  return (
    <div data-ledger className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <PageHead
        eyebrow="Core-dev governance"
        title="Protocol calls"
        lead={`AllCoreDevs and breakout calls, recapped. ${totalCalls.toLocaleString()} meetings across ${overview.length} series. Filter or search below, or explore by working group.`}
      />

      <div className="wrap space-y-16 py-8 sm:py-12">
        {/* ── Search, series filter, upcoming and recent calls right at the top ── */}
        <section>
          <Suspense fallback={null}>
            <CallsBrowser calls={recent} upcoming={upcoming} />
          </Suspense>
        </section>

        {/* ── Browse by working group ─────────────────────────── */}
        {GROUPS.map((g) => {
          const items = overview.filter((s) => s.group === g.key);
          if (items.length === 0) return null;
          return (
            <section key={g.key} className="space-y-6">
              <div>
                <div className="mb-3 flex items-center">
                  <span className="h-px w-10 bg-[var(--brand)]" />
                  <span className="h-px flex-1 bg-[var(--ink)]" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--brand-strong)] font-semibold">
                    {items.length} series
                  </span>
                  <h2 className="t-h2 mt-1 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
                    {g.label}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--ink-muted)] max-w-2xl">{g.blurb}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <SeriesCard key={s.series} s={s} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
