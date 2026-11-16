import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock, FileText, Gavel, Github } from 'lucide-react';
import { KeyDecisionsList } from '@/components/upgrade/key-decisions';
import type { ProvisionalCallRecap } from '@/data/provisional-call-recaps';

/**
 * Lightweight stop-gap view for a call not yet in `protocol_calls`. Shows the
 * summary and key decisions only. Replaced automatically by the full DB-backed
 * view once the ACDbot pipeline ingests the call.
 */
export function ProvisionalCallView({ recap }: { recap: ProvisionalCallRecap }) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-12 pt-8 sm:px-6">
      <Link
        href="/calls"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        All protocol calls
      </Link>

      <header className="border-b border-border/40 pb-5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          <Clock className="h-3.5 w-3.5" /> Provisional recap
        </span>
        <h1 className="dec-title persona-title mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {recap.title}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" /> {recap.displayDate}
          </span>
          {recap.issueUrl && (
            <a
              href={recap.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Github className="h-4 w-4" /> Agenda issue
            </a>
          )}
        </div>
      </header>

      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
        Early summary from the live call. The full recap, key decisions,
        transcript and recording will replace this automatically once the call is
        indexed.
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Summary
        </h2>
        <p className="rounded-xl border border-border bg-card/60 px-4 py-4 text-sm leading-relaxed text-foreground">
          {recap.summary}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          <Gavel className="h-4 w-4 text-muted-foreground" />
          Key decisions
        </h2>
        <KeyDecisionsList decisions={recap.keyDecisions} seekable={false} />
      </section>
    </div>
  );
}
