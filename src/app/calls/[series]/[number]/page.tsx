import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CalendarDays,
  FileText,
  Gavel,
} from 'lucide-react';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import { getCachedCallNeighbors } from '@/lib/upgrade-data.server';
import {
  callDisplayName,
  callSeriesBadgeClass,
  callSeriesShort,
} from '@/data/call-series';
import { findOfficeHourRecap } from '@/data/office-hour-recaps';
import { OfficeHourCallView } from '@/components/office-hour-call-view';
import { findProvisionalCallRecap } from '@/data/provisional-call-recaps';
import { ProvisionalCallView } from '@/components/provisional-call-view';
import { ShareButtons } from '@/components/share-buttons';
import { fetchTranscriptCues, fetchChatMessages } from '@/lib/call-artifacts';
import { getCallDetail } from '@/server/calls';
import { CallWorkspace } from '@/components/calls/call-workspace';

export const revalidate = 300;

type Props = { params: Promise<{ series: string; number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { series, number } = await params;
  const call = await getCallDetail(series, number);
  if (!call) {
    const recap = findOfficeHourRecap(series, number);
    if (recap) {
      return buildMetadata({
        title: `${recap.title} · Ethereum Protocol Calls`,
        description: recap.summary.slice(0, 160),
        path: `/calls/${series}/${number}`,
      });
    }
    const provisional = findProvisionalCallRecap(series, number);
    if (provisional) {
      return buildMetadata({
        title: `${provisional.title} · Ethereum Protocol Calls`,
        description: provisional.summary.slice(0, 160),
        path: `/calls/${series}/${number}`,
      });
    }
    return buildMetadata({
      title: 'Protocol Call Not Found',
      description: 'The requested protocol call recap could not be found.',
      path: `/calls/${series}/${number}`,
    });
  }

  const desc =
    call.summary ||
    (call.decisions.length > 0 ? call.decisions[0].text : 'Protocol call recording and recap.');

  return buildMetadata({
    title: `${call.title} · Ethereum Protocol Calls`,
    description: desc.slice(0, 160),
    path: `/calls/${series}/${number}`,
  });
}

export default async function ProtocolCallPage({ params }: Props) {
  const { series, number } = await params;
  const call = await getCallDetail(series, number);

  if (!call) {
    // Check fallback recaps for office hours / provisional calls
    const recap = findOfficeHourRecap(series, number);
    if (recap) return <OfficeHourCallView recap={recap} />;
    const provisional = findProvisionalCallRecap(series, number);
    if (provisional) return <ProvisionalCallView recap={provisional} />;
    notFound();
  }

  const artifactId = call.callId || (call.date ? `${call.date}_${call.number ?? number}` : number);
  const [rawTranscript, chatMessages] = await Promise.all([
    call.hasTranscript ? fetchTranscriptCues(call.series, artifactId) : Promise.resolve(null),
    call.hasChat ? fetchChatMessages(call.series, artifactId) : Promise.resolve(null),
  ]);

  const transcriptCues = rawTranscript
    ? rawTranscript.map((c) => {
        const parts = c.start.split(':').map(Number);
        let seconds = 0;
        if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
        else if (parts.length === 1) seconds = parts[0];

        let speaker: string | null = null;
        let text = c.text;
        const speakerMatch = c.text.match(/^([A-Za-z0-9_\-\s]+?):\s*(.*)$/);
        if (speakerMatch && speakerMatch[1].length < 30) {
          speaker = speakerMatch[1];
          text = speakerMatch[2];
        }

        return {
          seconds,
          stamp: c.start,
          speaker,
          text,
        };
      })
    : null;

  const neighbors = call.date
    ? await getCachedCallNeighbors(call.series, call.date)
    : { prev: null, next: null };

  // Social sharing snippets
  const shareHashtags = [callSeriesShort(call.series).replace(/[^A-Za-z0-9]/g, ''), 'Ethereum'];
  const shareOpener = `${call.title} is now live on @EIPsInsight.`;
  const shareText = call.decisions.length > 0
    ? `${shareOpener}\n\n→ ${call.decisions[0].text}`
    : shareOpener;

  return (
    <div data-ledger className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      {/* ── Masthead: Ledger surface band with engineering-paper grid ── */}
      <header className="masthead border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="wrap py-6 sm:py-8">
          {/* Breadcrumb + Previous / Next */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <Link
              href="/calls"
              className="group inline-flex items-center gap-1.5 font-mono text-xs text-[var(--ink-muted)] transition-colors hover:text-[var(--brand-strong)]"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>All protocol calls</span>
            </Link>
            <div className="flex items-center gap-2">
              {neighbors.prev && (
                <Link
                  href={`/calls/${neighbors.prev.series}/${neighbors.prev.number}`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--ink-muted)] transition-colors hover:border-[var(--brand-strong)]/40 hover:text-[var(--ink)]"
                  title={neighbors.prev.name ?? undefined}
                >
                  <ArrowLeft className="h-3 w-3" /> Previous
                </Link>
              )}
              {neighbors.next && (
                <Link
                  href={`/calls/${neighbors.next.series}/${neighbors.next.number}`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--ink-muted)] transition-colors hover:border-[var(--brand-strong)]/40 hover:text-[var(--ink)]"
                  title={neighbors.next.name ?? undefined}
                >
                  Next <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>

          {/* Eyebrow badge */}
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="inline-block h-[7px] w-[7px] rounded-[1px] bg-[var(--brand)]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--brand-strong)] font-semibold">
              {callSeriesShort(call.series)}
            </span>
            <span className="text-[var(--ink-faint)]">/</span>
            <span className="font-mono text-xs text-[var(--ink-muted)]">
              #{call.number ?? number}
            </span>
          </div>

          {/* Title and Share */}
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <h1 className="t-h1 max-w-4xl text-2xl sm:text-3xl lg:text-4xl text-[var(--ink)]">
              {call.title}
            </h1>
            <ShareButtons text={shareText} hashtags={shareHashtags} />
          </div>

          {/* Metadata ledger row */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--border)] pt-3.5 text-xs text-[var(--ink-muted)]">
            {call.date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-[var(--brand-strong)]" /> {call.date}
              </span>
            )}
            {call.decisions.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Gavel className="h-3.5 w-3.5 text-[var(--brand-strong)]" /> {call.decisions.length} decision
                {call.decisions.length === 1 ? '' : 's'}
              </span>
            )}
            {call.eipMentions.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-[var(--brand-strong)]" /> {call.eipMentions.length} proposal
                {call.eipMentions.length === 1 ? '' : 's'} discussed
              </span>
            )}
            {transcriptCues && transcriptCues.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[var(--ink-muted)]" /> {transcriptCues.length} transcript lines
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Call Workspace */}
      <div className="wrap py-8 sm:py-10">
        <CallWorkspace
          call={call}
          transcript={transcriptCues}
          chat={chatMessages}
        />
      </div>
    </div>
  );
}
