'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ContractRow = {
  rank: number;
  name: string;
  addr: string;
  txs: number;
  kind: string;
  flagged: boolean;
  invs: string[];
};

const addrUrl = (a: string) => `https://etherscan.io/address/${a}`;
const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;
const fmt = (n: number) => n.toLocaleString();

type SortKey = 'rank' | 'name' | 'kind' | 'txs' | 'invs';
type Filters = { name: string; kind: string; addr: string; txs: string; invs: string };
const EMPTY: Filters = { name: '', kind: '', addr: '', txs: '', invs: '' };

/**
 * Data-grid contracts table for the Glamsterdam scan: every column has its own
 * filter box and every column sorts (click the header). Shared by the
 * 300-scanned set and the 115-flagged set.
 */
export function ContractsTable({
  rows,
  pageSize = 10,
  showScan = false,
}: {
  rows: ContractRow[];
  pageSize?: number;
  showScan?: boolean;
}) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'rank', dir: 'asc' });
  const [page, setPage] = useState(0);

  const setFilter = (k: keyof Filters, v: string) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setPage(0);
  };

  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'txs' || key === 'invs' ? 'desc' : 'asc' },
    );
    setPage(0);
  };

  const anyFilter = Object.values(f).some((v) => v.trim() !== '');

  const processed = useMemo(() => {
    const nf = f.name.trim().toLowerCase();
    const kf = f.kind.trim().toLowerCase();
    const af = f.addr.trim().toLowerCase();
    const inf = f.invs.trim().toLowerCase();
    const txMin = f.txs.trim() ? Number(f.txs.replace(/[,_\s]/g, '')) : null;

    const out = rows.filter((r) => {
      if (nf && !r.name.toLowerCase().includes(nf)) return false;
      if (kf && !r.kind.toLowerCase().includes(kf)) return false;
      if (af && !r.addr.toLowerCase().includes(af)) return false;
      if (inf && !r.invs.join(' ').toLowerCase().includes(inf)) return false;
      if (txMin != null && !Number.isNaN(txMin) && r.txs < txMin) return false;
      return true;
    });

    const dir = sort.dir === 'asc' ? 1 : -1;
    out.sort((a, b) => {
      switch (sort.key) {
        case 'name':
          return dir * a.name.localeCompare(b.name);
        case 'kind':
          return dir * (a.kind.localeCompare(b.kind) || a.rank - b.rank);
        case 'txs':
          return dir * (a.txs - b.txs);
        case 'invs':
          return dir * (a.invs.length - b.invs.length || a.rank - b.rank);
        default:
          return dir * (a.rank - b.rank);
      }
    });
    return out;
  }, [rows, f, sort]);

  const pageCount = Math.max(1, Math.ceil(processed.length / pageSize));
  const cur = Math.min(page, pageCount - 1);
  const slice = processed.slice(cur * pageSize, cur * pageSize + pageSize);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sort.key !== k ? (
      <ChevronsUpDown className="h-3 w-3 text-[var(--ink-faint)] opacity-60" />
    ) : sort.dir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[var(--brand-strong)]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[var(--brand-strong)]" />
    );

  const Th = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <th className={cn('px-3 py-2 font-semibold', className)}>
      <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-[var(--ink)]">
        {label}
        <SortIcon k={k} />
      </button>
    </th>
  );

  const filterInput = (k: keyof Filters, placeholder: string, numeric = false) => (
    <input
      value={f[k]}
      onChange={(e) => setFilter(k, e.target.value)}
      placeholder={placeholder}
      inputMode={numeric ? 'numeric' : 'text'}
      className="h-7 w-full min-w-0 rounded-[var(--l-radius-control)] border border-[var(--border)] bg-[var(--paper)] px-2 text-[12px] font-normal normal-case tracking-normal text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--brand-strong)]/50"
    />
  );

  return (
    <div>
      <div className="overflow-x-auto rounded-[var(--l-radius)] border border-[var(--border)]">
        <table className="w-full min-w-[760px] text-[14px]">
          <thead>
            <tr className="bg-[var(--surface-2)] text-left mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
              <Th k="rank" label="#" className="w-10" />
              <Th k="name" label="Contract" />
              <Th k="kind" label="Kind" />
              <th className="px-3 py-2 font-semibold">Address</th>
              <Th k="txs" label="Txs" />
              <Th k="invs" label={showScan ? 'Invariants / scan' : 'Invariants'} />
            </tr>
            <tr className="bg-[var(--surface-2)]/60 align-top">
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5">{filterInput('name', 'name…')}</td>
              <td className="px-2 py-1.5">{filterInput('kind', 'kind…')}</td>
              <td className="px-2 py-1.5">{filterInput('addr', '0x…')}</td>
              <td className="px-2 py-1.5">{filterInput('txs', 'min', true)}</td>
              <td className="px-2 py-1.5">{filterInput('invs', 'INV-4…')}</td>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-[13px] text-[var(--ink-muted)]">
                  No contracts match these filters.
                </td>
              </tr>
            ) : (
              slice.map((c) => (
                <tr key={c.addr} className="border-t border-[var(--border)]/60">
                  <td className="px-3 py-2.5 mono text-[12px] tabular-nums text-[var(--ink-faint)]">{c.rank}</td>
                  <td className="px-3 py-2.5 font-medium text-[var(--ink)]">
                    {c.name || <span className="text-[var(--ink-faint)]">(unverified source)</span>}
                  </td>
                  <td className="px-3 py-2.5 mono text-[11px] text-[var(--ink-muted)]">{c.kind}</td>
                  <td className="px-3 py-2.5">
                    <a
                      href={addrUrl(c.addr)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mono text-[12px] text-[var(--brand-strong)] hover:underline"
                    >
                      {short(c.addr)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-3 py-2.5 mono tabular-nums text-[var(--ink-muted)]">{fmt(c.txs)}</td>
                  <td className="px-3 py-2.5 mono text-[12px] text-[var(--ink-muted)]">
                    {c.invs.length > 0 ? (
                      c.invs.join(' ')
                    ) : showScan && !c.flagged ? (
                      <span className="text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">clear</span>
                    ) : (
                      <span className="text-[var(--ink-faint)]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* footer: count + reset + pagination */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 mono text-[11px] text-[var(--ink-muted)]">
        <span className="flex items-center gap-2">
          {processed.length === 0
            ? '0 results'
            : `${cur * pageSize + 1}–${Math.min((cur + 1) * pageSize, processed.length)} of ${processed.length}`}
          {processed.length !== rows.length ? ` (filtered from ${rows.length})` : ''}
          {anyFilter && (
            <button
              type="button"
              onClick={() => {
                setF(EMPTY);
                setPage(0);
              }}
              className="text-[var(--brand-strong)] hover:underline"
            >
              reset
            </button>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={cur === 0}
            className="inline-flex items-center gap-1 rounded-[var(--l-radius-control)] border border-[var(--border)] px-2 py-1 transition-colors enabled:hover:border-[var(--brand-strong)]/40 enabled:hover:text-[var(--ink)] disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="tabular-nums">
            {cur + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={cur >= pageCount - 1}
            className="inline-flex items-center gap-1 rounded-[var(--l-radius-control)] border border-[var(--border)] px-2 py-1 transition-colors enabled:hover:border-[var(--brand-strong)]/40 enabled:hover:text-[var(--ink)] disabled:opacity-40"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
