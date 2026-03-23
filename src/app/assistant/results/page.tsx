'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, Database } from 'lucide-react';

type AssistantDataQuery = {
  title: string;
  description: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  rowCount: number;
  savedAt?: string;
  question?: string;
};

export default function AssistantResultsPage() {
  const [result, setResult] = useState<AssistantDataQuery | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('assistant:last-data-query');
      if (!raw) return;
      const parsed = JSON.parse(raw) as AssistantDataQuery;
      setResult(parsed);
    } catch {
      setResult(null);
    }
  }, []);

  const savedAt = useMemo(() => {
    if (!result?.savedAt) return null;
    const date = new Date(result.savedAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  }, [result?.savedAt]);

  return (
    <main className="mx-auto w-full max-w-[1360px] px-4 py-8 md:px-8 xl:px-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card/60 p-5 shadow-[0_14px_40px_rgb(var(--persona-accent-rgb)/0.12)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Assistant Result</p>
            <h1 className="mt-1 dec-title text-3xl font-semibold tracking-tight text-foreground">Detailed Analysis</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Full result view for assistant-generated data answers.
            </p>
          </div>
          {result && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-primary">
              <Database className="h-3.5 w-3.5" />
              {result.rowCount} rows
            </span>
          )}
        </div>
      </section>

      {!result ? (
        <section className="mt-5 rounded-2xl border border-border bg-card/50 p-8 text-center">
          <p className="text-base text-foreground">No assistant result is available yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Run a data question in the assistant, then open this page.</p>
        </section>
      ) : (
        <section className="mt-5 rounded-2xl border border-border bg-card/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{result.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{result.description}</p>
              {result.question && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Question: <span className="text-foreground/90">{result.question}</span>
                </p>
              )}
            </div>
            {savedAt && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                {savedAt}
              </span>
            )}
          </div>

          {result.columns.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {result.columns.map((column) => (
                      <th
                        key={column}
                        className="border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, index) => (
                    <tr key={`result-row-${index}`} className="border-b border-border/70 last:border-b-0">
                      {result.columns.map((column) => (
                        <td key={`${index}-${column}`} className="px-3 py-2.5 text-foreground/95">
                          {row[column] == null ? '—' : String(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No rows were returned for this query.</p>
          )}
        </section>
      )}
    </main>
  );
}

