'use client';

import Link from 'next/link';

interface AuthorRow {
  rank: number;
  author: string;
  eipsCreated: number;
  lastCreatedAt: string | null;
}

interface RoleAuthorsTableProps {
  rows: AuthorRow[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function RoleAuthorsTable({
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  loading,
}: RoleAuthorsTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-10 rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card/60">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Authors</p>
        <h3 className="dec-title mt-1 text-xl font-semibold tracking-tight text-foreground">EIP authors</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          People who authored proposals in the selected repo/category/time window.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-border/70">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Author</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">EIPs created</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.author}-${row.rank}`} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3 text-sm text-muted-foreground">{row.rank}</td>
                <td className="px-4 py-3 text-sm text-foreground">
                  <Link href={`/search?q=${encodeURIComponent(row.author)}`} className="hover:text-primary">
                    {row.author}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{row.eipsCreated.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(row.lastCreatedAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={4}>
                  No authors found for current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > pageSize && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Showing {Math.min((page - 1) * pageSize + 1, total)}-{Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-md border border-border bg-muted/40 px-2 py-1 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-muted-foreground">Page {page}</span>
            <button
              type="button"
              disabled={page * pageSize >= total}
              onClick={() => onPageChange(page + 1)}
              className="rounded-md border border-border bg-muted/40 px-2 py-1 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
