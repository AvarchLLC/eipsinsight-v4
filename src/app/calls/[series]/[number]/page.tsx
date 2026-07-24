import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Github,
  Video,
  Gavel,
  FileText,
  MessagesSquare,
} from 'lucide-react';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import {
  getCachedCall,
  getCachedCallNeighbors,
  getCachedRecentCalls,
} from '@/lib/upgrade-data.server';
import {
  callDisplayName,
  callSeriesBadgeClass,
  callSeriesShort,
} from '@/data/call-series';
import { CallTldr } from '@/components/upgrade/call-tldr';
import { ShareButtons } from '@/components/share-buttons';
import { KeyDecisionsList, type KeyDecision } from '@/components/upgrade/key-decisions';
import { CallPlayer, CallVideoFallback } from '@/components/upgrade/call-player';
import { CallChat } from '@/components/upgrade/call-chat';
import { CallAskAi } from '@/components/upgrade/call-ask-ai';
import {
  getRemoteSeries,
  fetchTranscriptCues,
  fetchChatMessages,
} from '@/lib/call-artifacts';

export const revalidate = 300;

type Props = { params: Promise<{ series: string; number: string }> };

function getYoutubeId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

async function getTranscriptCues(series: string, callId: string) {
  return fetchTranscriptCues(series, callId);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const call = await getCachedCall(resolvedParams.series, resolvedParams.number);
  if (!call) return {};
  return buildMetadata({
    title: callDisplayName(call),
    description: `Recording, summary, decisions, and transcript for ${callDisplayName(call)}.`,
    path: `/calls/${resolvedParams.series}/${resolvedParams.number}`,
    // null so the generated opengraph-image.tsx card is used instead of the
    // static site logo — that's what puts real call content in a shared post.
    image: null,
  });
}

export async function generateStaticParams() {
  const calls = await getCachedRecentCalls(20);
  return calls.map((call) => ({
    series: call.series,
    number: call.call_number ?? call.call_id,
  }));
}

export default async function CallDetailPage({ params }: Props) {
  const { series, number } = await params;
  const call = await getCachedCall(series, number);

  if (!call) {
    notFound();
  }

  const youtubeId = getYoutubeId(call.video_url);
  const remoteSeries = getRemoteSeries(call.series);

  const [transcriptCues, chatMessages] = await Promise.all([
    call.has_transcript ? getTranscriptCues(call.series, call.call_id) : Promise.resolve(null),
    call.has_chat ? fetchChatMessages(call.series, call.call_id) : Promise.resolve(null),
  ]);

  const payload = call.key_decisions as
    | KeyDecision[]
    | { key_decisions?: KeyDecision[] }
    | null;
  const decisions: KeyDecision[] = Array.isArray(payload)
    ? payload
    : (payload?.key_decisions ?? []);

  const neighbors = await getCachedCallNeighbors(call.series, call.occurred_on);

  // Series tag (ACDT/ACDE/…) first, matching how the account tags its posts.
  const shareHashtags = [callSeriesShort(call.series).replace(/[^A-Za-z0-9]/g, ''), 'Ethereum'];

  // X allows 280, counts any link as 23 regardless of its real length, and weights
  // emoji as 2. Everything below is fitted to that budget so the composer never
  // opens already over the limit.
  const TWEET_LIMIT = 280;
  const LINK_COST = 23;
  const weigh = (s: string) =>
    [...s].reduce((n, ch) => n + (ch.codePointAt(0)! > 0xffff ? 2 : 1), 0);
  const tweetBudget =
    TWEET_LIMIT - LINK_COST - shareHashtags.reduce((n, t) => n + t.length + 2, 0) - 2;

  /** Trim to a word boundary so a decision never ends mid-word. */
  const clip = (text: string, max: number) => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max - 1);
    return `${cut.slice(0, cut.lastIndexOf(' ')) || cut}…`;
  };

  const shareOpener = `${callDisplayName(call)} is now live on @EIPsInsight.`;

  // The decisions ARE the story — "4 key decisions" only states a count. Quote as
  // many as the budget allows, then spend whatever is left on the artifact line.
  const decisionLines = decisions
    .map((d) => clip(d.original_text ?? '', 105))
    .filter((d) => d.length > 20)
    .map((d) => `→ ${d}`);

  const artifactLine = [
    call.video_url ? '🎥 Recording' : null,
    call.tldr ? '📝 Summary' : null,
    transcriptCues ? `🔍 ${transcriptCues.length}-line transcript` : null,
    chatMessages && chatMessages.length > 0 ? '💬 Chat' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // Greedily add decisions while they fit, reserving room for the artifact line.
  const chosen: string[] = [];
  for (const line of decisionLines) {
    const candidate = [shareOpener, [...chosen, line].join('\n'), artifactLine]
      .filter(Boolean)
      .join('\n\n');
    if (weigh(candidate) > tweetBudget) break;
    chosen.push(line);
  }

  const shareText =
    chosen.length > 0
      ? [shareOpener, chosen.join('\n'), artifactLine].filter(Boolean).join('\n\n')
      : // No quotable decision - fall back to naming what's on the page.
        [shareOpener, artifactLine].filter(Boolean).join('\n\n');

  // EIPs discussed: union of every EIP referenced across the decisions.
  const discussedEips = Array.from(
    new Set(decisions.flatMap((d) => (Array.isArray(d.eips) ? d.eips : [])))
  ).sort((a, b) => a - b);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 pt-8 sm:px-6">
      {/* Back + prev/next */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/calls"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          All protocol calls
        </Link>
        <div className="flex items-center gap-1.5">
          {neighbors.prev && (
            <Link
              href={`/calls/${neighbors.prev.series}/${neighbors.prev.number}`}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              title={neighbors.prev.name ?? undefined}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Previous
            </Link>
          )}
          {neighbors.next && (
            <Link
              href={`/calls/${neighbors.next.series}/${neighbors.next.number}`}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              title={neighbors.next.name ?? undefined}
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-border/40 pb-5">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'inline-flex w-16 items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              callSeriesBadgeClass(call.series)
            )}
          >
            {callSeriesShort(call.series)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{call.call_id}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="persona-title text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {callDisplayName(call)}
          </h1>
          {/* Template names what's actually on the page, so a share reads as a
              useful pointer rather than a bare link. The platform appends the URL. */}
          <ShareButtons text={shareText} hashtags={shareHashtags} />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" /> {call.occurred_on}
          </span>
          {decisions.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Gavel className="h-4 w-4" /> {decisions.length} decision{decisions.length === 1 ? '' : 's'}
            </span>
          )}
          {transcriptCues && (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> {transcriptCues.length} transcript lines
            </span>
          )}
        </div>
      </header>

      {/* Synced video + transcript workspace */}
      {youtubeId ? (
        <CallPlayer youtubeId={youtubeId} cues={transcriptCues ?? []} />
      ) : call.video_url ? (
        <CallVideoFallback videoUrl={call.video_url} />
      ) : null}

      {/* Ask AI (only useful when there's summary/transcript to ground it) */}
      {(call.tldr || transcriptCues) && (
        <CallAskAi
          series={call.series}
          number={call.call_number ?? call.call_id}
          suggestions={[
            'What were the main decisions?',
            'Summarize this call in 3 points',
            ...(discussedEips.length > 0 ? [`What was said about EIP-${discussedEips[0]}?`] : []),
          ]}
        />
      )}

      {/* Below: summary + decisions/eips/links */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Meeting chat sits above the summary and is collapsed by default, so the
              always-expanded summary below it stays close to the top of the column. */}
          {chatMessages && chatMessages.length > 0 && <CallChat messages={chatMessages} />}

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Call summary
            </h2>
            {call.tldr ? (
              <CallTldr tldr={call.tldr} />
            ) : (
              <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
                No summary synced for this call yet.
              </p>
            )}
          </section>

          {/* Transcript fallback when there's a transcript but no embeddable video */}
          {call.has_transcript && !youtubeId && (
            <a
              href={`https://github.com/ethereum/pm/tree/master/.github/ACDbot/artifacts/${remoteSeries}/${call.call_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              View transcript & raw artifacts on GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="space-y-6 lg:col-span-1">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <Gavel className="h-4 w-4 text-muted-foreground" />
              Key decisions
            </h2>
            {decisions.length > 0 ? (
              <KeyDecisionsList decisions={decisions} seekable={Boolean(youtubeId)} />
            ) : (
              <div className="rounded-xl border border-border bg-card/60 px-4 py-6 text-center text-sm text-muted-foreground">
                No key decisions recorded for this call.
              </div>
            )}
          </section>

          {discussedEips.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">EIPs discussed</h3>
              <div className="flex flex-wrap gap-1.5">
                {discussedEips.map((eip) => (
                  <Link
                    key={eip}
                    href={`/eip/${eip}`}
                    className="rounded-md border border-border bg-card/60 px-2 py-0.5 font-mono text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    EIP-{eip}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="space-y-3 rounded-xl border border-border bg-card/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">Links</h3>
            <ul className="space-y-2 text-xs">
              {call.issue_number && (
                <li>
                  <a
                    href={`https://github.com/ethereum/pm/issues/${call.issue_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Github className="h-4 w-4" />
                    Agenda issue #{call.issue_number}
                  </a>
                </li>
              )}
              {call.video_url && (
                <li>
                  <a
                    href={call.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Video className="h-4 w-4" />
                    Watch on YouTube
                  </a>
                </li>
              )}
              {call.has_chat && (
                <li>
                  <a
                    href={`https://github.com/ethereum/pm/tree/master/.github/ACDbot/artifacts/${remoteSeries}/${call.call_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <MessagesSquare className="h-4 w-4" />
                    Meeting chat log
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`https://github.com/ethereum/pm/tree/master/.github/ACDbot/artifacts/${remoteSeries}/${call.call_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  All call artifacts
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
