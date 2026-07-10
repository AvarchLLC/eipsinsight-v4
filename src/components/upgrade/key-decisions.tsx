import Link from 'next/link';
import { Fragment } from 'react';
import { FlaskConical, Gavel, Star } from 'lucide-react';
import { normalizeUpgradeBucket } from '@/lib/upgrade-stages';
import { StageBadge } from '@/components/upgrade/stage-badge';
import { DecisionTimestamp } from '@/components/upgrade/decision-timestamp';

export interface KeyDecision {
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
export function EipLinkedText({ text }: { text: string }) {
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

export function DecisionTypeMarker({ decision }: { decision: KeyDecision }) {
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

export function KeyDecisionsList({
  decisions,
  seekable = false,
}: {
  decisions: KeyDecision[];
  /** When true, timestamps become buttons that seek the on-page call video. */
  seekable?: boolean;
}) {
  if (!decisions || decisions.length === 0) return null;

  return (
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
                {decision.timestamp &&
                  (seekable ? (
                    <DecisionTimestamp timestamp={decision.timestamp} />
                  ) : (
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
                      {decision.timestamp}
                    </span>
                  ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
