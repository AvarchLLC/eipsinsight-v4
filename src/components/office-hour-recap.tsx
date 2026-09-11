"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Youtube, CalendarClock, ArrowRight, CheckCircle2, ListChecks, ExternalLink, ChevronDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OhRecap, OhPrStatus } from "@/data/office-hour-recaps";

const STATUS_META: Record<OhPrStatus, { label: string; cls: string }> = {
  MERGED: { label: "Merged", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  WAITING_ON_EDITOR: { label: "Waiting on Editor", cls: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  WAITING_ON_AUTHOR: { label: "Waiting on Author", cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  OPEN: { label: "Open", cls: "border-border bg-muted/60 text-muted-foreground" },
};

function StatusBadge({ status }: { status: OhPrStatus }) {
  const m = STATUS_META[status];
  return <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", m.cls)}>{m.label}</span>;
}

function RecapHeader({ recap }: { recap: OhRecap }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" /> {recap.displayDate} · Meeting #{recap.meeting}
        </div>
        <h3 className="mt-0.5 text-base font-semibold text-foreground">{recap.title}</h3>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {/* Editorial activity is EIP-editing PR data — only meaningful for office hours, not EIPIP process meetings. */}
        {recap.series === "eipoh" && (
          <Link
            href={`/officehours?mode=day&day=${recap.dateISO}`}
            title={`Editorial activity from ${recap.displayDate}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/15"
          >
            <Activity className="h-3.5 w-3.5" /> Editorial activity
          </Link>
        )}
        {recap.youtube && (
          <Link href={recap.youtube} target="_blank" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 text-xs font-medium text-red-600 hover:bg-red-500/15 dark:text-red-400">
            <Youtube className="h-3.5 w-3.5" /> Watch
          </Link>
        )}
        <Link href={recap.issueUrl} target="_blank" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 text-xs text-muted-foreground hover:text-foreground">
          Issue <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function prHref(repo: string, pr: number) {
  const gh = repo === "eips" ? "ethereum/EIPs" : repo === "rips" ? "ethereum/RIPs" : "ethereum/ERCs";
  return `https://github.com/${gh}/pull/${pr}`;
}

/** Collapsible recap card — small preview that expands to full detail. */
const PR_PREVIEW_COUNT = 4;

export function OfficeHourRecap({ recap, defaultOpen = false }: { recap: OhRecap; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAllPrs, setShowAllPrs] = useState(false);
  const merged = recap.prs.filter((p) => p.status === "MERGED").length;
  const visiblePrs = showAllPrs ? recap.prs : recap.prs.slice(0, PR_PREVIEW_COUNT);

  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <RecapHeader recap={recap} />
      <p className={cn("mt-3 text-sm leading-relaxed text-muted-foreground", !open && "line-clamp-2")}>{recap.summary}</p>

      {/* Preview stats + toggle (always visible) */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 flex w-full flex-wrap items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2 text-left text-[12px] text-muted-foreground transition-colors hover:border-primary/40"
      >
        <span><strong className="text-foreground">{recap.prs.length}</strong> PRs reviewed</span>
        <span><strong className="text-emerald-600 dark:text-emerald-400">{merged}</strong> merged</span>
        <span><strong className="text-foreground">{recap.decisions.length}</strong> decisions</span>
        <span><strong className="text-foreground">{recap.actionItems.length}</strong> action items</span>
        <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary">
          {open ? "Hide details" : "Show details"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {!open ? null : (
      <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Decisions</div>
          <ul className="space-y-1.5 text-[13px] text-muted-foreground">
            {recap.decisions.map((d, i) => <li key={i} className="flex gap-1.5"><ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />{d}</li>)}
          </ul>
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-muted-foreground"><ListChecks className="h-3.5 w-3.5" /> Action items</div>
          <ul className="space-y-1.5 text-[13px] text-muted-foreground">
            {recap.actionItems.map((a, i) => <li key={i} className="flex gap-1.5"><ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />{a}</li>)}
          </ul>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Pull requests reviewed ({recap.prs.length})</div>
        <ul className="space-y-2">
          {visiblePrs.map((p) => (
            <li key={p.pr} className="rounded-lg border border-border/70 bg-background/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <Link href={prHref(p.repo, p.pr)} target="_blank" className="min-w-0 text-sm font-medium text-foreground hover:text-primary">
                  <span className="font-mono text-muted-foreground">{p.repo.toUpperCase()} #{p.pr}</span> · {p.title}
                </Link>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{p.note}</p>
              <p className="mt-1 text-[11px] text-muted-foreground/80">by {p.author}</p>
            </li>
          ))}
        </ul>
        {recap.prs.length > PR_PREVIEW_COUNT && (
          <button
            onClick={() => setShowAllPrs((v) => !v)}
            aria-expanded={showAllPrs}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-background/40 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:border-primary/40"
          >
            {showAllPrs ? "Show fewer" : `Show ${recap.prs.length - PR_PREVIEW_COUNT} more`}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showAllPrs && "rotate-180")} />
          </button>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3 text-[12px] text-muted-foreground">Next: {recap.nextMeeting}</div>
      </>
      )}
    </section>
  );
}

/** Compact recap card — for the Overview tab. */
export function OfficeHourRecapCompact({ recap }: { recap: OhRecap }) {
  const merged = recap.prs.filter((p) => p.status === "MERGED").length;
  return (
    <section className="rounded-xl border border-border bg-card/60 p-4">
      <RecapHeader recap={recap} />
      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{recap.summary}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
        <span><strong className="text-foreground">{recap.prs.length}</strong> PRs reviewed</span>
        <span><strong className="text-emerald-600 dark:text-emerald-400">{merged}</strong> merged</span>
        <span><strong className="text-foreground">{recap.decisions.length}</strong> decisions</span>
        <Link href={`/calls/${recap.series}/${recap.meeting}`} className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Full recap <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
