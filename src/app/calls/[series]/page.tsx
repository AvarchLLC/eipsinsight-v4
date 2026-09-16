import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  GitPullRequest,
  Youtube,
} from 'lucide-react';
import '@/lib/orpc.server';
import { buildMetadata } from '@/lib/seo';
import { getCachedRecentCalls } from '@/lib/upgrade-data.server';
import { callSeriesLabel, callSeriesShort } from '@/data/call-series';
import { OFFICE_HOUR_SERIES, OFFICE_HOUR_RECAPS } from '@/data/office-hour-recaps';

export const revalidate = 300;

type Props = { params: Promise<{ series: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series } = await params;
  const label = callSeriesLabel(series);
  return buildMetadata({
    title: `${label} calls`,
    description: `Recordings, summaries, decisions, and transcripts for the ${label} protocol call series.`,
    path: `/calls/${series}`,
  });
}

/** One rich recap card, merged from either the DB call or a static recap. */
type CallCard = {
  key: string;
  href: string;
  number: string;
  title: string;
  dateISO: string;
  displayDate: string;
  summary: string | null;
  decisions: number;
  hasTranscript: boolean;
  youtube: string | null;
  issueUrl: string | null;
  /** Office-hour recaps only. */
  prs: number | null;
  merged: number | null;
  /** EIP-editing PR data — the "Editorial activity" link is only meaningful for eipoh. */
  officeHour: boolean;
};

function prettyDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** Pull a lead sentence from a defensively-shaped tldr payload. */
function tldrSummary(tldr: unknown): string | null {
  if (!tldr || typeof tldr !== 'object') return null;
  const t = tldr as Record<string, unknown>;
  if (typeof t.summary === 'string' && t.summary.trim()) return t.summary.trim();
  const highlights = t.highlights;
  if (Array.isArray(highlights) && typeof highlights[0] === 'string') return highlights[0];
  return null;
}

function tldrDecisionCount(tldr: unknown): number {
  const t = tldr as { decisions?: unknown[]; key_decisions?: unknown[] } | null;
  const d = t?.decisions ?? t?.key_decisions;
  return Array.isArray(d) ? d.length : 0;
}

function tldrMeetingName(tldr: unknown): string | null {
  const m = (tldr as { meeting?: unknown } | null)?.meeting;
  return typeof m === 'string' && m.trim() ? m.trim() : null;
}

/**
 * Series landing page: every call in one series (e.g. /calls/ethproofs,
 * /calls/eipip), each linking to /calls/<series>/<number>. Merges DB-backed
 * calls with the static office-hour-style recaps, then renders each as a rich
 * recap card (summary, decision/PR counts, recording + issue links).
 */
export default async function CallSeriesPage({ params }: Props) {
  const { series } = await params;

  const dbCards: CallCard[] = (await getCachedRecentCalls(300))
    .filter((c) => c.series === series)
    .map((c) => {
      const number = String(c.call_number ?? c.call_id);
      return {
        key: `db-${c.call_id}`,
        href: `/calls/${series}/${number}`,
        number,
        title: c.display_name ?? tldrMeetingName(c.tldr) ?? `${callSeriesShort(series)} #${number}`,
        dateISO: c.occurred_on,
        displayDate: prettyDate(c.occurred_on),
        summary: tldrSummary(c.tldr),
        decisions: tldrDecisionCount(c.tldr),
        hasTranscript: Boolean(c.has_transcript),
        youtube: c.video_url ?? null,
        issueUrl: c.issue_number ? `https://github.com/ethereum/pm/issues/${c.issue_number}` : null,
        prs: null,
        merged: null,
        officeHour: series === 'eipoh',
      };
    });

  const staticCards: CallCard[] = OFFICE_HOUR_SERIES.has(series)
    ? OFFICE_HOUR_RECAPS.filter((r) => r.series === series).map((r) => ({
        key: `recap-${r.meeting}`,
        href: `/calls/${series}/${r.meeting}`,
        number: String(r.meeting),
        title: r.title,
        dateISO: r.dateISO,
        displayDate: r.displayDate,
        summary: r.summary,
        decisions: r.decisions.length,
        hasTranscript: true,
        youtube: r.youtube || null,
        issueUrl: r.issueUrl || null,
        prs: r.prs.length,
        merged: r.prs.filter((p) => p.status === 'MERGED').length,
        officeHour: r.series === 'eipoh',
      }))
    : [];

  // De-dupe by href (a call may exist in both sources); keep the DB copy.
  const seen = new Set<string>();
  const cards = [...dbCards, ...staticCards]
    .filter((c) => (seen.has(c.href) ? false : (seen.add(c.href), true)))
    .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());

  const label = callSeriesLabel(series);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/calls"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> All protocol calls
      </Link>

      <header className="mt-5 border-b border-border/40 pb-5">
        <h1 className="persona-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{label}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {cards.length === 0
            ? 'No calls found for this series yet.'
            : `Every ${label} session with its recording, AI summary, key decisions, and full transcript. ${cards.length} meeting${cards.length === 1 ? '' : 's'} archived.`}
        </p>
      </header>

      {cards.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          Nothing here yet. Browse{' '}
          <Link href="/calls" className="underline transition-colors hover:text-foreground">
            all protocol calls
          </Link>
          , or check back after the next scheduler sync.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {cards.map((c) => (
            <RecapCard key={c.key} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecapCard({ card }: { card: CallCard }) {
  return (
    <article className="group rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" /> {card.displayDate} · Meeting #{card.number}
          </div>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            <Link href={card.href} className="transition-colors hover:text-primary">
              {card.title}
            </Link>
          </h2>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {card.officeHour && (
            <Link
              href={`/officehours?mode=day&day=${card.dateISO}`}
              title={`Editorial activity from ${card.displayDate}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/15"
            >
              <Activity className="h-3.5 w-3.5" /> Editorial activity
            </Link>
          )}
          {card.youtube && (
            <Link
              href={card.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 text-xs font-medium text-red-600 hover:bg-red-500/15 dark:text-red-400"
            >
              <Youtube className="h-3.5 w-3.5" /> Watch
            </Link>
          )}
          {card.issueUrl && (
            <Link
              href={card.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Issue <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {card.summary && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{card.summary}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        {card.prs != null && card.prs > 0 && (
          <span className="inline-flex items-center gap-1">
            <GitPullRequest className="h-3.5 w-3.5" />
            <strong className="font-semibold text-foreground">{card.prs}</strong> PRs reviewed
          </span>
        )}
        {card.merged != null && card.merged > 0 && (
          <span>
            <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{card.merged}</strong> merged
          </span>
        )}
        {card.decisions > 0 && (
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <strong className="font-semibold text-foreground">{card.decisions}</strong> decisions
          </span>
        )}
        {card.hasTranscript && (
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> transcript
          </span>
        )}
        <Link
          href={card.href}
          className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          Full recap <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
