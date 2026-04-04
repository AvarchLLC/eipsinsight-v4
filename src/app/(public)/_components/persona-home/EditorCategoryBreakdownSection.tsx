'use client';

import React from 'react';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopyLinkButton } from '@/components/header';

type EditorRepoFilter = '' | 'eips' | 'ercs' | 'rips';

type MonthOption = {
  value: string;
  label: string;
};

type EditorCategoryBreakdownSectionProps = {
  sectionTitleClass: string;
  sectionSubtitleClass: string;
  monthLabelText: string;
  currentMonthYear: string;
  setCurrentMonthYear: (value: string) => void;
  monthYearOptions: MonthOption[];
  editorRepoFilter: EditorRepoFilter;
  setEditorRepoFilter: (value: EditorRepoFilter) => void;
  boardPreviewLoading: boolean;
  categoryBreakdownChartOption: unknown;
  participantCount: number;
  editorCategoryPage: number;
  editorCategoryTotalPages: number;
  setEditorCategoryPage: React.Dispatch<React.SetStateAction<number>>;
};

export default function EditorCategoryBreakdownSection({
  sectionTitleClass,
  sectionSubtitleClass,
  monthLabelText,
  currentMonthYear,
  setCurrentMonthYear,
  monthYearOptions,
  editorRepoFilter,
  setEditorRepoFilter,
  boardPreviewLoading,
  categoryBreakdownChartOption,
  participantCount,
  editorCategoryPage,
  editorCategoryTotalPages,
  setEditorCategoryPage,
}: EditorCategoryBreakdownSectionProps) {
  return (
    <section className="mb-6 border-t border-border/70 pt-6" id="editor-category-breakdown">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className={sectionTitleClass}>Category Breakdown</h2>
          <p className={sectionSubtitleClass}>Participants × process stacked distribution for open PRs.</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Month context: {monthLabelText}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={currentMonthYear}
            onChange={(e) => setCurrentMonthYear(e.target.value)}
            className="h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {monthYearOptions.map((opt) => (
              <option key={`cat-month-${opt.value}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <CopyLinkButton sectionId="editor-category-breakdown" className="h-8 w-8 rounded-md" />
        </div>
      </div>
      <div className="mb-3 inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 p-0.5 text-xs">
        {(
          [
            { key: '', label: 'All' },
            { key: 'eips', label: 'EIPs' },
            { key: 'ercs', label: 'ERCs' },
            { key: 'rips', label: 'RIPs' },
          ] as const
        ).map((item) => (
          <button
            key={`editor-category-repo-${item.label}`}
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
      <div className="overflow-hidden rounded-lg border border-border/70 bg-card/40 p-3">
        {boardPreviewLoading ? (
          <div className="h-[260px] animate-pulse rounded bg-muted" />
        ) : !categoryBreakdownChartOption ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No category data available.</p>
        ) : (
          <ReactECharts
            option={categoryBreakdownChartOption as object}
            style={{ height: '300px', width: '100%' }}
            opts={{ renderer: 'svg' }}
          />
        )}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-2 text-xs text-muted-foreground">
          <span>
            Showing {participantCount} participant buckets
          </span>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditorCategoryPage((p) => Math.max(1, p - 1))}
              disabled={editorCategoryPage <= 1}
              className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="tabular-nums">Page {editorCategoryPage} / {editorCategoryTotalPages}</span>
            <button
              type="button"
              onClick={() => setEditorCategoryPage((p) => Math.min(editorCategoryTotalPages, p + 1))}
              disabled={editorCategoryPage >= editorCategoryTotalPages}
              className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <Link
          href="/analytics/prs"
          className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/15"
        >
          Explore PR Analytics
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

