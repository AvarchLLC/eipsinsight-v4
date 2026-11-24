'use client';

import { ArrowUpRight, ExternalLink, Sparkles } from 'lucide-react';

export function AIDisclaimerBox() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pt-0 pb-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs shadow-xs transition-colors hover:border-[var(--brand)]/30">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <p className="font-sans text-[var(--ink-muted)] leading-relaxed">
              <span className="font-semibold text-[var(--ink)]">AI Disclaimer:</span> Some content or metadata on EIPsInsight may be AI-inferred or automatically compiled. If you spot any discrepancy, please let us know.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono sm:border-l sm:border-[var(--border)] sm:pl-3">
            <a
              href="mailto:dev@avarch.org?subject=EIPsInsight%20Feedback"
              className="inline-flex items-center gap-1 text-[var(--brand-strong)] hover:underline"
            >
              <span>dev@avarch.org</span>
              <ArrowUpRight className="h-3 w-3" />
            </a>
            <span className="text-[var(--ink-faint)]">·</span>
            <a
              href="https://github.com/AvarchLLC/eipsinsight-v4/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              <span>GitHub Issue</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIDisclaimerBox;
