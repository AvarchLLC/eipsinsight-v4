import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';
import { FlaskConical, Gavel, Github, Star, Video } from 'lucide-react';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import { getCachedRecentDecisions } from '@/lib/upgrade-data.server';
import { normalizeUpgradeBucket } from '@/lib/upgrade-stages';
import { callDisplayName, callSeriesBadgeClass, callSeriesShort } from '@/data/call-series';
import { StageBadge } from '@/components/upgrade/stage-badge';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Protocol Decisions',
  description:
    'Key decisions from AllCoreDevs and breakout calls — stage changes, devnet inclusions, and headliner selections, with timestamps and sources.',
  path: '/upgrade/decisions',
  keywords: ['AllCoreDevs decisions', 'Ethereum governance', 'ACD decisions'],
});

interface KeyDecision {
  original_text: string;
  timestamp?: string;
  type?: 'stage_change' | 'devnet_inclusion' | 'headliner_selected' | 'other';
  eips?: number[];
  stage_change?: { to?: string };
  devnet?: string;
  fork?: string;
  context?: string;
}

/** Render text with EIP-#### references linked to proposal pages. */
function EipLinkedText({ text }: { text: string }) {
  const parts = text.split(/(EIP-\d+)/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = part.match(/^EIP-(\d+)$/);
        if (!match) return <Fragment key={index}>{part}</Fragment>;
        return (
          <Link
            key={index}
            href={`/eip/${match[1]}`}
            className="font-mono text-xs font-semibold text-primary hover:underline"
          >
            {part}
          </Link>
        );
      })}
    </>
  );
}

function DecisionTypeMarker({ decision }: { decision: KeyDecision }) {
  if (decision.type === 'stage_change' && decision.stage_change?.to) {
    return <StageBadge bucket={normalizeUpgradeBucket(decision.stage_change.to)} abbreviated />;
  }
  if (decision.type === 'devnet_inclusion') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:text-cyan-300">
        <FlaskConical className="h-2.5 w-2.5" />
        {decision.devnet ?? 'devnet'}
      </span>
    );
  }
  if (decision.type === 'headliner_selected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
        <Star className="h-2.5 w-2.5 fill-current" />
        headliner
      </span>
    );
  }
  return null;
}

export default async function DecisionsPage() {
  const calls = await getCachedRecentDecisions(12);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-12 pt-8 sm:px-6">
      <header>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
          Protocol decisions
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          What was actually decided on each core-dev call — stage changes, devnet
          inclusions, and headliner selections, extracted from call recordings with
          timestamps.
        </p>
      </header>

      {calls.length === 0 && (
        <p className="rounded-xl border border-border bg-card/60 px-4 py-6 text-sm text-muted-foreground">
          No structured decisions synced yet — run the protocol-calls sync (decisions are
          fetched alongside call summaries).
        </p>
      )}

      {calls.map((call) => {
        const payload = call.key_decisions as { key_decisions?: KeyDecision[] } | KeyDecision[] | null;
        const decisions: KeyDecision[] = Array.isArray(payload)
          ? payload
          : (payload?.key_decisions ?? []);
        if (decisions.length === 0) return null;

        return (
          <section key={`${call.series}-${call.call_id}`}>
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span
                className={cn(
                  'inline-flex w-16 shrink-0 items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                  callSeriesBadgeClass(call.series)
                )}
              >
                {callSeriesShort(call.series)}
              </span>
              <h2 className="text-base font-semibold text-foreground">
                {callDisplayName(call)}
              </h2>
              <span className="text-xs text-muted-foreground">{call.occurred_on}</span>
              <span className="ml-auto flex items-center gap-3">
                {call.video_url && (
                  <a
                    href={call.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Recording
                  </a>
                )}
                {call.issue_number && (
                  <a
                    href={`https://github.com/ethereum/pm/issues/${call.issue_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Github className="h-3.5 w-3.5" />
                    Agenda
                  </a>
                )}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card/60">
              <ul className="divide-y divide-border/60">
                {decisions.map((decision, index) => (
                  <li key={index} className="flex gap-3 px-4 py-3">
                    <Gavel className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-relaxed text-foreground">
                        <EipLinkedText text={decision.original_text} />
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <DecisionTypeMarker decision={decision} />
                        {decision.context && (
                          <span className="text-xs text-muted-foreground">{decision.context}</span>
                        )}
                        {decision.timestamp && (
                          <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
                            {decision.timestamp}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
}
