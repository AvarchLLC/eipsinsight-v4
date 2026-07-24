'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, RotateCcw, Settings2, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FORK_SCHEDULE_CONFIGS,
  DEFAULT_PHASE_DURATIONS,
  calculateForkSchedule,
  type PhaseDurations,
} from '@/data/fork-schedule';
import { getUpgradeRegistryEntry } from '@/data/upgrade-registry';

const FORK_COLORS: Record<string, string> = {
  glamsterdam: '#8b5cf6',
  hegota: '#0ea5e9',
  fusaka: '#10b981',
  pectra: '#f59e0b',
};
const forkColor = (slug: string) => FORK_COLORS[slug] ?? '#64748b';

const DURATION_GROUPS: Array<{ group: string; items: Array<{ key: keyof PhaseDurations; label: string }> }> = [
  {
    group: 'Headliners',
    items: [
      { key: 'HEADLINER_SELECTION_DURATION', label: 'Proposal → Selection' },
      { key: 'SELECTION_TO_EIP_PFI', label: 'Selection → PFI' },
    ],
  },
  {
    group: 'Non-headliners',
    items: [
      { key: 'EIP_PFI_DURATION', label: 'PFI → CFI' },
      { key: 'EIP_SELECTION_TO_DEVNET', label: 'CFI → Devnet' },
    ],
  },
  {
    group: 'Devnets',
    items: [
      { key: 'DEVNET_DURATION', label: 'Between each' },
      { key: 'DEVNET_TO_SEPOLIA', label: 'Last → Sepolia' },
    ],
  },
  {
    group: 'Testnets',
    items: [
      { key: 'SEPOLIA_TO_HOODI', label: 'Sepolia → Hoodi' },
      { key: 'HOODI_TO_MAINNET', label: 'Hoodi → Mainnet' },
    ],
  },
];

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const daysBetween = (a: string, b: string) =>
  Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
const fmtShort = (iso: string) =>
  toDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

interface ForkPlan {
  slug: string;
  name: string;
  color: string;
  devnetCount: number;
  byId: Map<string, { id: string; label: string; date: string; locked?: boolean }>;
  gapById: Record<string, number | null>;
  milestones: { id: string; label: string; date: string; locked?: boolean }[];
}

export function SchedulePlanner() {
  const initialTargets = useMemo(
    () => Object.fromEntries(FORK_SCHEDULE_CONFIGS.map((c) => [c.slug, c.mainnetTarget])),
    []
  );
  const [durations, setDurations] = useState<PhaseDurations>(DEFAULT_PHASE_DURATIONS);
  const [targets, setTargets] = useState<Record<string, string>>(initialTargets);
  const [showSettings, setShowSettings] = useState(false);
  // Resolve "now" only after mount, so SSR and the first client render are
  // identical (the Today marker's exact position would otherwise mismatch).
  // Deferred to a timeout so the state update isn't synchronous in the effect.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setNowMs(Date.now()), 0);
    return () => clearTimeout(id);
  }, []);

  const dirty =
    JSON.stringify(durations) !== JSON.stringify(DEFAULT_PHASE_DURATIONS) ||
    JSON.stringify(targets) !== JSON.stringify(initialTargets);

  const { forks, rowGroups } = useMemo(() => {

    const maxDevnets = Math.max(...FORK_SCHEDULE_CONFIGS.map((c) => c.devnetCount), 0);
    const groups: Array<{ group: string; rows: Array<{ id: string; label: string }> }> = [
      {
        group: 'Headliners',
        rows: [
          { id: 'headliner-proposals', label: 'Proposal Deadline' },
          { id: 'headliner-selection', label: 'Selection Date' },
        ],
      },
      {
        group: 'Non-headliners',
        rows: [
          { id: 'eip-pfi', label: 'PFI Deadline' },
          { id: 'eip-sfi', label: 'CFI Deadline' },
        ],
      },
      {
        group: 'Devnets',
        rows: Array.from({ length: maxDevnets }, (_, i) => ({ id: `devnet-${i}`, label: `Devnet-${i}` })),
      },
      {
        group: 'Testnets',
        rows: [
          { id: 'sepolia', label: 'Sepolia' },
          { id: 'hoodi', label: 'Hoodi' },
        ],
      },
      { group: 'Mainnet', rows: [{ id: 'mainnet', label: 'Mainnet' }] },
    ];
    const ids = groups.flatMap((g) => g.rows.map((r) => r.id)); // flat order for gap calc

    const list: ForkPlan[] = FORK_SCHEDULE_CONFIGS.map((config) => {
      const target = targets[config.slug] ?? config.mainnetTarget;
      const milestones = calculateForkSchedule({ ...config, mainnetTarget: target }, durations);
      const byId = new Map(milestones.map((m) => [m.id, m]));

      // Gap (days from the previous present milestone, in canonical order).
      const gaps: Record<string, number | null> = {};
      let prev: string | null = null;
      for (const id of ids) {
        const m = byId.get(id);
        if (!m) continue;
        gaps[id] = prev ? daysBetween(prev, m.date) : null;
        prev = m.date;
      }

      return {
        slug: config.slug,
        name: getUpgradeRegistryEntry(config.slug)?.name ?? config.slug,
        color: forkColor(config.slug),
        devnetCount: config.devnetCount,
        milestones,
        byId,
        gapById: gaps,
      };
    });

    return { forks: list, rowGroups: groups };
  }, [targets, durations]);

  const updateDuration = (key: keyof PhaseDurations, value: number) =>
    setDurations((d) => ({ ...d, [key]: Math.max(1, value || 1) }));
  const reset = () => {
    setDurations(DEFAULT_PHASE_DURATIONS);
    setTargets(initialTargets);
  };

  // ---- Timeline (Gantt) geometry ----
  const { months, startMs, endMs } = useMemo(() => {
    const times = forks.flatMap((f) => f.milestones.map((m) => toDate(m.date).getTime()));
    if (nowMs != null) times.push(nowMs);
    const min = new Date(Math.min(...times));
    const max = new Date(Math.max(...times));
    const start = new Date(Date.UTC(min.getUTCFullYear(), min.getUTCMonth(), 1));
    const end = new Date(Date.UTC(max.getUTCFullYear(), max.getUTCMonth() + 1, 1));
    const list: string[] = [];
    const cur = new Date(start);
    while (cur < end) {
      list.push(cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }));
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return { months: list, startMs: start.getTime(), endMs: end.getTime() };
  }, [forks, nowMs]);

  const pos = (iso: string) => ((toDate(iso).getTime() - startMs) / (endMs - startMs)) * 100;
  const todayPct = nowMs != null ? ((nowMs - startMs) / (endMs - startMs)) * 100 : null;
  const LABEL_W = 160;
  const MONTH_W = 74;
  const ROW_H = 40;
  const gridW = months.length * MONTH_W;

  return (
    <div className="space-y-8">
      {/* ============ FORK TIMELINE PLANNING ============ */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card/50">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
          <div>
            <h2 className="dec-title text-lg font-semibold tracking-tight text-foreground">
              Fork Timeline Planning
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              See the cascading impact of scheduling decisions. Edit a mainnet target or the phase
              durations and every projected date shifts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Durations
              <ChevronDown className={cn('h-3 w-3 transition-transform', showSettings && 'rotate-180')} />
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={!dirty}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors enabled:hover:border-red-500/40 enabled:hover:text-red-500 disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Collapsible duration settings */}
        {showSettings && (
          <div className="border-b border-border bg-muted/30 p-4 sm:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Phase durations (days between milestones)
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
              {DURATION_GROUPS.map(({ group, items }) => (
                <div key={group} className="space-y-1.5">
                  <div className="border-b border-border/60 pb-1 text-[11px] font-semibold text-foreground">
                    {group}
                  </div>
                  {items.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                      <input
                        type="number"
                        min={1}
                        value={durations[key]}
                        onChange={(e) => updateDuration(key, parseInt(e.target.value, 10))}
                        className="h-6 w-12 rounded border border-border bg-background text-center text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Editable timeline grid */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="sticky left-0 z-10 bg-muted/40 px-5 py-3">Milestone</th>
                {forks.map((fork) => (
                  <th key={fork.slug} className="px-5 py-3">
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fork.color }} />
                      {fork.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowGroups.map(({ group, rows }) => (
                <Fragment key={group}>
                  {/* Group header row */}
                  <tr className="bg-muted/25">
                    <td
                      colSpan={forks.length + 1}
                      className="sticky left-0 z-10 bg-muted/25 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {group}
                    </td>
                  </tr>
                  {rows.map(({ id, label }) => {
                    const isMainnet = id === 'mainnet';
                    return (
                      <tr key={id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-card/50 py-3 pl-8 pr-5 text-sm font-medium text-foreground">
                          {label}
                        </td>
                        {forks.map((fork) => {
                          const m = fork.byId.get(id);
                          if (!m) {
                            return (
                              <td key={fork.slug} className="px-5 py-3 text-sm text-muted-foreground/30">
                                —
                              </td>
                            );
                          }
                          const gap = fork.gapById[id];
                          return (
                            <td key={fork.slug} className="whitespace-nowrap px-5 py-3 text-sm">
                              <span className="inline-flex items-center gap-2">
                                {isMainnet ? (
                                  <input
                                    type="date"
                                    value={targets[fork.slug] ?? m.date}
                                    onChange={(e) =>
                                      e.target.value &&
                                      setTargets((t) => ({ ...t, [fork.slug]: e.target.value }))
                                    }
                                    className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                                  />
                                ) : (
                                  <span className={cn('font-medium', m.locked ? 'text-primary' : 'text-foreground')}>
                                    {fmtShort(m.date)}
                                  </span>
                                )}
                                {m.locked && !isMainnet && (
                                  <Pin className="h-3.5 w-3.5 text-primary" aria-label="Confirmed date" />
                                )}
                                {gap != null && (
                                  <span
                                    className={cn(
                                      'text-xs',
                                      gap < 0 ? 'font-semibold text-red-500' : 'text-muted-foreground/60'
                                    )}
                                  >
                                    ({gap >= 0 ? '+' : ''}
                                    {gap}d)
                                  </span>
                                )}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
          Hypothetical projections for planning - not commitments. Dates with{' '}
          <Pin className="inline h-3 w-3 text-primary" /> are confirmed via AllCoreDevs; the rest
          are projected from the mainnet target and shift as you edit.
        </p>
      </section>

      {/* ============ TIMELINE VIEW (GANTT) ============ */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card/50">
        <div className="border-b border-border p-4 sm:p-5">
          <h2 className="dec-title text-lg font-semibold tracking-tight text-foreground">Timeline View</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Upgrade phases and milestones across forks, on a shared calendar.
          </p>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: LABEL_W + gridW }} className="relative">
            {/* Month header */}
            <div className="flex border-b border-border bg-muted/30">
              <div
                className="sticky left-0 z-20 flex shrink-0 items-center border-r border-border bg-muted/50 px-3 py-2"
                style={{ width: LABEL_W }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Fork
                </span>
              </div>
              {months.map((label, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center border-r border-border/50"
                  style={{ width: MONTH_W }}
                >
                  <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="relative">
              {forks.map((fork) => (
                <Fragment key={fork.slug}>
                  {/* Fork header row */}
                  <div className="flex border-b border-border/50 bg-muted/20" style={{ height: 42 }}>
                    <div
                      className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-border bg-muted/30 px-3"
                      style={{ width: LABEL_W }}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: fork.color }} />
                      <span className="text-sm font-semibold text-foreground">{fork.name}</span>
                    </div>
                    <div className="relative" style={{ width: gridW }}>
                      <div className="absolute inset-0 flex">
                        {months.map((_, i) => (
                          <div key={i} className="border-r border-border/30" style={{ width: MONTH_W }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* One row per phase */}
                  {rowGroups.map((grp) => {
                    const ms = grp.rows
                      .map((r) => fork.byId.get(r.id))
                      .filter((m): m is NonNullable<typeof m> => Boolean(m));
                    if (ms.length === 0) return null;
                    const dates = ms.map((m) => m.date).sort();
                    const first = dates[0];
                    const last = dates[dates.length - 1];
                    return (
                      <div key={grp.group} className="flex border-b border-border/30" style={{ height: ROW_H }}>
                        <div
                          className="sticky left-0 z-10 flex shrink-0 items-center border-r border-border bg-card/50 pl-8 pr-3"
                          style={{ width: LABEL_W }}
                        >
                          <span className="text-xs text-muted-foreground">{grp.group}</span>
                        </div>
                        <div className="relative" style={{ width: gridW }}>
                          {/* Month gridlines */}
                          <div className="absolute inset-0 flex">
                            {months.map((_, i) => (
                              <div key={i} className="border-r border-border/30" style={{ width: MONTH_W }} />
                            ))}
                          </div>
                          {/* Phase span bar (only when the phase spans multiple dates) */}
                          {first !== last && (
                            <div
                              className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full opacity-25"
                              style={{
                                left: `${pos(first)}%`,
                                width: `${Math.max(0.5, pos(last) - pos(first))}%`,
                                backgroundColor: fork.color,
                              }}
                            />
                          )}
                          {/* Milestone dots */}
                          {ms.map((m) => (
                            <div
                              key={m.id}
                              className="group absolute top-1/2 -translate-y-1/2"
                              style={{ left: `${pos(m.date)}%` }}
                            >
                              <div
                                className="h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-background"
                                style={{ backgroundColor: fork.color }}
                              />
                              <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                {m.label}
                                <br />
                                {fmtShort(m.date)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </Fragment>
              ))}

              {/* Today marker (client-only, after mount) */}
              {todayPct != null && todayPct >= 0 && todayPct <= 100 && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0"
                  style={{ left: LABEL_W, width: gridW }}
                >
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/80" style={{ left: `${todayPct}%` }}>
                    <span className="absolute left-1/2 top-1 -translate-x-1/2 rounded bg-red-500 px-1 py-0.5 text-[9px] font-semibold text-white">
                      Today
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border bg-muted/20 px-4 py-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-6 rounded-full bg-muted-foreground/30" /> phase span
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/60 ring-2 ring-background" /> milestone
          </span>
          {forks.map((fork) => (
            <span key={fork.slug} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fork.color }} />
              {fork.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
