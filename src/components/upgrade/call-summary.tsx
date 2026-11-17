'use client';

import { AlertTriangle, CalendarClock, FileText, Gavel, ListTodo, Sparkles } from 'lucide-react';
import { EipLinkedText } from '@/components/upgrade/key-decisions';
import { CallTldr } from '@/components/upgrade/call-tldr';
import { ungroundedDateTokens } from '@/lib/date-grounding';

/**
 * Two-tier renderer for an ACDbot-shaped tldr.json:
 *   - "At a glance": the decisions + targets (the outcome and what's next)
 *   - "Detailed notes": the highlights grouped by category, plus action items
 *
 * Falls back to the generic <CallTldr> for other tldr shapes (e.g. the
 * office-hour "Key Outcomes / Decisions" string lists), which have no
 * `highlights` object to split on.
 */

type Item = Record<string, unknown>;

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function titleize(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function Stamp({ value }: { value: string }) {
  if (!value) return null;
  return (
    <span className="ml-1.5 align-middle font-mono text-[10px] text-muted-foreground/55">
      {value}
    </span>
  );
}

/** Summary text + an amber "verify" flag when it names a date not in the transcript. */
function GroundedText({ text, transcript }: { text: string; transcript: string | null }) {
  const ungrounded = transcript ? ungroundedDateTokens(text, transcript) : [];
  return (
    <>
      <EipLinkedText text={text} />
      {ungrounded.length > 0 && (
        <span
          className="ml-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 align-middle text-[10px] font-medium text-amber-700 dark:text-amber-300"
          title={`${ungrounded.join(', ')} not found in the call transcript. This date is auto-generated and may be inaccurate, so verify it against the recording.`}
        >
          <AlertTriangle className="h-2.5 w-2.5" />
          verify date
        </span>
      )}
    </>
  );
}

export function CallSummary({
  tldr,
  transcript = null,
}: {
  tldr: unknown;
  /** Normalized transcript text; enables the date-grounding flag when present. */
  transcript?: string | null;
}) {
  if (!tldr || typeof tldr !== 'object') return null;
  const t = tldr as Record<string, unknown>;

  const highlights =
    t.highlights && typeof t.highlights === 'object' && !Array.isArray(t.highlights)
      ? (t.highlights as Record<string, unknown>)
      : null;

  // Not an ACDbot-shaped payload — render the generic sections instead.
  if (!highlights) {
    return (
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Summary
        </h2>
        <CallTldr tldr={tldr} />
      </section>
    );
  }

  const decisions = (Array.isArray(t.decisions) ? (t.decisions as Item[]) : [])
    .map((d) => ({ text: str(d.decision), ts: str(d.timestamp) }))
    .filter((d) => d.text);
  const targets = (Array.isArray(t.targets) ? (t.targets as Item[]) : [])
    .map((d) => ({ text: str(d.target), ts: str(d.timestamp) }))
    .filter((d) => d.text);
  const actionItems = (Array.isArray(t.action_items) ? (t.action_items as Item[]) : [])
    .map((d) => ({ text: str(d.action), owner: str(d.owner) }))
    .filter((d) => d.text);
  const categories = Object.entries(highlights).filter(
    ([, v]) => Array.isArray(v) && (v as unknown[]).length > 0,
  ) as [string, Item[]][];

  const hasGlance = decisions.length > 0 || targets.length > 0;

  return (
    <div className="space-y-6">
      {hasGlance && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            At a glance
          </h2>
          <div className="space-y-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-4">
            {decisions.map((d, i) => (
              <div key={`d-${i}`} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                <Gavel className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  <GroundedText text={d.text} transcript={transcript} />
                </span>
              </div>
            ))}
            {targets.map((d, i) => (
              <div key={`t-${i}`} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  <GroundedText text={d.text} transcript={transcript} />
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Detailed notes
          </h2>
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card/60">
            {categories.map(([cat, items]) => (
              <div key={cat} className="px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {titleize(cat)}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {items.map((it, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm leading-relaxed text-foreground/90"
                    >
                      <span className="mt-0.5 shrink-0 text-primary">•</span>
                      <span>
                        <GroundedText text={str(it.highlight)} transcript={transcript} />
                        <Stamp value={str(it.timestamp)} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {actionItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            Action items
          </h2>
          <ul className="space-y-1.5 rounded-xl border border-border bg-card/60 px-4 py-3">
            {actionItems.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                <span className="mt-0.5 shrink-0 text-primary">•</span>
                <span>
                  <EipLinkedText text={a.text} />
                  {a.owner && (
                    <span className="ml-1.5 rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {a.owner}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
