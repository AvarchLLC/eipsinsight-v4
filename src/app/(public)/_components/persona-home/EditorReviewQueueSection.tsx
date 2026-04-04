'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopyLinkButton } from '@/components/header';

type EditorRepoFilter = '' | 'eips' | 'ercs' | 'rips';

type BoardRow = {
  prNumber: number;
  title: string | null;
  author: string | null;
  createdAt: string;
  repo: string;
  repoShort: string;
  govState: string;
  waitDays: number;
  processType: string;
};

type ProcessStat = {
  type: string;
  count: number;
};

type EditorReviewQueueSectionProps = {
  sectionTitleClass: string;
  sectionSubtitleClass: string;
  editorRepoFilter: EditorRepoFilter;
  setEditorRepoFilter: (value: EditorRepoFilter) => void;
  orderedBoardProcessTypes: string[];
  boardProcessStats: ProcessStat[];
  selectedBoardProcesses: string[];
  setSelectedBoardProcesses: React.Dispatch<React.SetStateAction<string[]>>;
  boardPreviewLoading: boolean;
  boardPreviewRows: BoardRow[];
  boardPreviewTotal: number;
  editorQueuePage: number;
  boardPreviewTotalPages: number;
  setEditorQueuePage: React.Dispatch<React.SetStateAction<number>>;
  boardProcessBadgeMap: Record<string, string>;
  githubRepoFromShort: (repoShort: string) => string;
};

export default function EditorReviewQueueSection({
  sectionTitleClass,
  sectionSubtitleClass,
  editorRepoFilter,
  setEditorRepoFilter,
  orderedBoardProcessTypes,
  boardProcessStats,
  selectedBoardProcesses,
  setSelectedBoardProcesses,
  boardPreviewLoading,
  boardPreviewRows,
  boardPreviewTotal,
  editorQueuePage,
  boardPreviewTotalPages,
  setEditorQueuePage,
  boardProcessBadgeMap,
  githubRepoFromShort,
}: EditorReviewQueueSectionProps) {
  return (
    <section className="mb-6" id="editor-review-queue">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className={sectionTitleClass}>Editor Review Queue</h2>
          <p className={sectionSubtitleClass}>Open PRs currently waiting on editor action.</p>
        </div>
        <CopyLinkButton sectionId="editor-review-queue" className="h-8 w-8 rounded-md" />
      </div>

      <div className="mb-2 inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 p-0.5 text-xs">
        {(
          [
            { key: '', label: 'All' },
            { key: 'eips', label: 'EIPs' },
            { key: 'ercs', label: 'ERCs' },
            { key: 'rips', label: 'RIPs' },
          ] as const
        ).map((item) => (
          <button
            key={`editor-queue-repo-${item.label}`}
            onClick={() => setEditorRepoFilter(item.key)}
            className={cn(
              'rounded px-2.5 py-1',
              editorRepoFilter === item.key ? 'bg-card text-foreground' : 'text-muted-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-3 rounded-lg border border-border/70 bg-card/40 p-2.5">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Process (multi-select)</p>
        <div className="flex flex-wrap gap-1.5">
          {orderedBoardProcessTypes.map((processType) => {
            const count = boardProcessStats.find((item) => item.type === processType)?.count ?? 0;
            const active = selectedBoardProcesses.includes(processType);
            return (
              <button
                key={`editor-process-${processType}`}
                type="button"
                onClick={() =>
                  setSelectedBoardProcesses((prev) =>
                    prev.includes(processType) ? prev.filter((item) => item !== processType) : [...prev, processType],
                  )
                }
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                  active
                    ? (boardProcessBadgeMap[processType] || 'border-primary/40 bg-primary/10 text-primary')
                    : 'border-border bg-muted/60 text-muted-foreground hover:border-primary/30 hover:text-foreground',
                )}
              >
                <span>{processType}</span>
                <span className="tabular-nums">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/70 bg-card/40">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-xs">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40">
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PR</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                <th className="w-20 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repo</th>
                <th className="w-28 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Process</th>
                <th className="w-36 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Participants</th>
                <th className="w-16 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Wait</th>
                <th className="w-24 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
                <th className="w-16 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Open</th>
              </tr>
            </thead>
            <tbody>
              {boardPreviewLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`board-row-skeleton-${i}`} className="border-b border-border/60">
                    <td colSpan={8} className="px-3 py-2.5">
                      <div className="h-5 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : boardPreviewRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    No PRs currently waiting on editor.
                  </td>
                </tr>
              ) : (
                boardPreviewRows.map((row) => (
                  <tr key={`board-row-${row.repo}-${row.prNumber}`} className="border-b border-border/60 align-top transition-colors hover:bg-muted/30">
                    <td className="px-3 py-2.5 font-mono font-semibold text-primary">
                      <Link href={`/pr/${githubRepoFromShort(row.repoShort)}/${row.prNumber}`} className="font-semibold text-primary hover:underline">
                        #{row.prNumber}
                      </Link>
                    </td>
                    <td className="max-w-[420px] px-3 py-2.5">
                      <p className="truncate leading-snug text-foreground">{row.title || 'Untitled PR'}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{row.author || '—'}</p>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.repoShort.toUpperCase()}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn('whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium', boardProcessBadgeMap[row.processType] ?? boardProcessBadgeMap['Content Edit'])}>
                        {row.processType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="whitespace-nowrap rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {row.govState}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{row.waitDays}d</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{new Date(`${row.createdAt}T00:00:00`).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 text-center">
                      <a
                        href={`https://github.com/${row.repo}/pull/${row.prNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] text-primary transition-colors hover:bg-primary/15"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>
            Showing {(boardPreviewTotal === 0 ? 0 : (editorQueuePage - 1) * 6 + 1)}–
            {Math.min(editorQueuePage * 6, boardPreviewTotal)} of {boardPreviewTotal}
          </span>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditorQueuePage((p) => Math.max(1, p - 1))}
              disabled={editorQueuePage <= 1}
              className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="tabular-nums">Page {editorQueuePage} / {boardPreviewTotalPages}</span>
            <button
              type="button"
              onClick={() => setEditorQueuePage((p) => Math.min(boardPreviewTotalPages, p + 1))}
              disabled={editorQueuePage >= boardPreviewTotalPages}
              className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <Link
          href="/tools/board?status=Waiting+on+Editor&page=1"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/15"
        >
          Explore Board
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

