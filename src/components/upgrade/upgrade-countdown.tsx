'use client';

/**
 * Live activation countdown + chain visualizer shown above the subtab bar on an
 * upgrade detail page.
 *
 * Two layers:
 *  1. Countdown — timestamp-driven (no network needed), ticks every second to
 *     the activation slot's wall-clock time. Always works.
 *  2. Live chain — polls the network's beacon + execution RPC for the current
 *     slot / epoch / block and renders the slots/epochs progress toward target.
 *     Degrades gracefully: if the RPC is unreachable, the countdown still shows.
 *
 * To add a fork, drop an entry in COUNTDOWN_CONFIG keyed by its slug.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Confetti from 'react-confetti';
import { Rocket, FileText, Boxes, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECONDS_PER_SLOT = 12;
const SLOTS_PER_EPOCH = 32;
const POLL_MS = 12_000;

type CountdownTarget = {
  key: string;
  label: string;
  epoch?: number;
  timestamp?: number; // unix seconds of the activation slot
  estimate?: string;
  beaconApi?: string;
  rpc?: string;
};

type CountdownConfig = { title: string; metaEip?: number; targets: CountdownTarget[] };

const COUNTDOWN_CONFIG: Record<string, CountdownConfig> = {
  glamsterdam: {
    title: 'Glamsterdam',
    metaEip: 7773,
    targets: [
      {
        key: 'sepolia',
        label: 'Sepolia',
        epoch: 353024,
        timestamp: 1791294816, // 2026-10-06 13:53:36 UTC
        beaconApi: 'https://ethereum-sepolia-beacon-api.publicnode.com',
        rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
      },
      { key: 'hoodi', label: 'Hoodi', estimate: '~Oct 27, 2026' },
      { key: 'mainnet', label: 'Mainnet', estimate: 'Early Dec 2026' },
    ],
  },
};

export function hasCountdown(slug: string): boolean {
  return slug in COUNTDOWN_CONFIG;
}

type Remaining = { total: number; days: number; hours: number; minutes: number; seconds: number };

function computeRemaining(targetMs: number, nowMs: number): Remaining {
  const total = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  return {
    total,
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

function useWindowSize() {
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}

type ChainState = { slot: number; epoch: number; block: number } | null;

export function UpgradeCountdown({ slug }: { slug: string }) {
  const config = COUNTDOWN_CONFIG[slug];
  const [selected, setSelected] = useState<string>(() => {
    if (!config) return '';
    const nowSec = Date.now() / 1000;
    const upcoming = config.targets.find((t) => t.timestamp && t.timestamp > nowSec);
    return (upcoming ?? config.targets[0])?.key ?? '';
  });
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [celebrated, setCelebrated] = useState(false);
  const [chain, setChain] = useState<ChainState>(null);
  const [chainError, setChainError] = useState(false);
  const [viewMode, setViewMode] = useState<'slots' | 'epochs'>('slots');
  const { w, h } = useWindowSize();

  const target = useMemo(() => config?.targets.find((t) => t.key === selected), [config, selected]);

  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchChain = useCallback(async (t: CountdownTarget) => {
    if (!t.beaconApi || !t.rpc) {
      setChain(null);
      setChainError(false);
      return;
    }
    try {
      const [beaconRes, rpcRes] = await Promise.all([
        fetch(`${t.beaconApi}/eth/v1/beacon/headers/head`),
        fetch(t.rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        }),
      ]);
      const beaconData = await beaconRes.json();
      const rpcData = await rpcRes.json();
      const slot = Number.parseInt(beaconData?.data?.header?.message?.slot, 10);
      const block = Number.parseInt(rpcData?.result, 16);
      if (!Number.isFinite(slot)) throw new Error('bad slot');
      setChain({ slot, epoch: Math.floor(slot / SLOTS_PER_EPOCH), block: Number.isFinite(block) ? block : 0 });
      setChainError(false);
    } catch {
      setChainError(true);
    }
  }, []);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!target) return;
    setChain(null);
    fetchChain(target);
    if (pollRef.current) clearInterval(pollRef.current);
    if (target.beaconApi && target.rpc) pollRef.current = setInterval(() => fetchChain(target), POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [target, fetchChain]);

  const live = Boolean(target?.timestamp && nowMs !== null && nowMs >= target.timestamp * 1000);

  useEffect(() => {
    if (live && !celebrated) {
      setCelebrated(true);
      const id = setTimeout(() => setCelebrated(false), 6000);
      return () => clearTimeout(id);
    }
  }, [live, celebrated]);

  if (!config) return null;

  const remaining =
    target?.timestamp && nowMs !== null ? computeRemaining(target.timestamp * 1000, nowMs) : null;
  const targetSlot = target?.epoch ? target.epoch * SLOTS_PER_EPOCH : null;
  const slotsRemaining =
    chain && targetSlot ? Math.max(0, targetSlot - chain.slot)
    : remaining ? Math.ceil(remaining.total / SECONDS_PER_SLOT) : null;
  const epochsRemaining = slotsRemaining !== null ? Math.ceil(slotsRemaining / SLOTS_PER_EPOCH) : null;
  const targetDate = target?.timestamp ? new Date(target.timestamp * 1000) : null;
  const showGrid = Boolean(chain && targetSlot && target?.epoch && !live);

  const dateLabel = targetDate
    ? targetDate.toLocaleString('en-US', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false,
      }) + ' UTC'
    : null;

  const segments: Array<[string, number | undefined]> = [
    ['Days', remaining?.days],
    ['Hrs', remaining?.hours],
    ['Min', remaining?.minutes],
    ['Sec', remaining?.seconds],
  ];

  return (
    <div className="mt-5">
      {celebrated && live && w > 0 && (
        <Confetti width={w} height={h} recycle={false} numberOfPieces={320} gravity={0.25}
          className="pointer-events-none fixed inset-0 z-50" />
      )}

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.06] via-card/40 to-card/40">
        {/* Top bar: title + network selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75',
                live ? 'bg-emerald-400 animate-ping' : 'bg-primary animate-ping')} />
              <span className={cn('relative inline-flex h-2 w-2 rounded-full', live ? 'bg-emerald-500' : 'bg-primary')} />
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {config.title} {live ? 'activation' : 'activates in'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {config.targets.map((t) => (
              <button
                key={t.key}
                onClick={() => setSelected(t.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  t.key === selected
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', t.timestamp ? 'bg-emerald-500' : 'bg-amber-500')} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          {!target?.timestamp ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{target?.label}</span> activation is tentative
              {target?.estimate ? ` (${target.estimate})` : ''}. A live countdown appears once ACD locks the slot.
            </p>
          ) : live ? (
            <div className="flex items-center gap-2.5">
              <Rocket className="h-6 w-6 text-emerald-500" />
              <div>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {config.title} is live on {target.label}
                </p>
                {dateLabel && <p className="text-xs text-muted-foreground">Activated {dateLabel}</p>}
              </div>
            </div>
          ) : (
            <>
              {/* Hero countdown */}
              <div className="flex items-end gap-2 sm:gap-3">
                {segments.map(([label, value], i) => (
                  <div key={label} className="flex items-end gap-2 sm:gap-3">
                    <div className="flex flex-col items-center">
                      <span className="bg-gradient-to-b from-foreground to-foreground/55 bg-clip-text font-mono text-4xl font-bold leading-none tabular-nums text-transparent sm:text-5xl">
                        {nowMs === null ? '--' : String(value ?? 0).padStart(2, '0')}
                      </span>
                      <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                        {label}
                      </span>
                    </div>
                    {i < segments.length - 1 && (
                      <span className="pb-5 font-mono text-3xl font-light leading-none text-muted-foreground/40 sm:text-4xl">:</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Target line */}
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>
                  until <span className="font-semibold text-foreground">{config.title}</span> on{' '}
                  <span className="font-semibold text-foreground">{target.label}</span>
                </span>
                {dateLabel && <span className="text-muted-foreground/60">·</span>}
                {dateLabel && <span>{dateLabel}</span>}
                {config.metaEip && (
                  <>
                    <span className="text-muted-foreground/60">·</span>
                    <Link href={`/eip/${config.metaEip}`}
                      className="inline-flex items-center gap-1 font-medium text-amber-600 hover:underline dark:text-amber-400">
                      <FileText className="h-3 w-3" />
                      EIP-{config.metaEip}
                    </Link>
                  </>
                )}
              </div>
            </>
          )}

          {/* Live chain */}
          {target?.beaconApi && !live && (
            <div className="mt-4">
              {chainError && !chain ? null : !chain ? (
                <div className="flex gap-1.5">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div key={i} className="hidden h-5 w-5 animate-pulse rounded bg-muted-foreground/10 sm:block" />
                  ))}
                </div>
              ) : (
                <>
                  {/* inline live stats + view toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> live {target.label}
                      </span>
                      <span className="text-muted-foreground/50">·</span>
                      <span>block <span className="font-mono tabular-nums text-foreground/80">{chain.block.toLocaleString()}</span></span>
                      <span className="text-muted-foreground/50">·</span>
                      <span>slot <span className="font-mono tabular-nums text-foreground/80">{chain.slot.toLocaleString()}</span></span>
                      <span className="text-muted-foreground/50">·</span>
                      <span>epoch <span className="font-mono tabular-nums text-foreground/80">{chain.epoch.toLocaleString()}</span></span>
                    </div>

                    <div className="inline-flex rounded-lg bg-muted/60 p-0.5">
                      {([['slots', 'Slots', Boxes], ['epochs', 'Epochs', Layers]] as const).map(([mode, label, Ico]) => (
                        <button key={mode} onClick={() => setViewMode(mode)}
                          className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors',
                            viewMode === mode ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                          <Ico className="h-3 w-3" />{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {showGrid && target.epoch && targetSlot && (
                    <div className="mt-3">
                      {viewMode === 'slots'
                        ? renderSlotsGrid(chain, target.label)
                        : renderEpochsGrid(chain, target.epoch, slotsRemaining ?? 0, epochsRemaining ?? 0, target.label)}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Current epoch's 32 slots as a clean dot grid (hover for detail). */
function renderSlotsGrid(chain: NonNullable<ChainState>, network: string) {
  const startSlot = chain.epoch * SLOTS_PER_EPOCH;
  const cells = Array.from({ length: SLOTS_PER_EPOCH }, (_, i) => startSlot + i);
  const posInEpoch = chain.slot - startSlot;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-[5px]">
        {cells.map((slot, i) => {
          const done = slot < chain.slot;
          const current = slot === chain.slot;
          const block = chain.block - (chain.slot - slot);
          return (
            <div
              key={slot}
              title={`Slot ${slot.toLocaleString()} · pos ${i}/32 · ~block ${block.toLocaleString()} · ${network}`}
              className={cn(
                'h-5 w-5 rounded-[5px] transition-colors',
                current
                  ? 'bg-primary ring-2 ring-primary/30 animate-pulse'
                  : done
                    ? 'bg-emerald-500/85'
                    : 'bg-muted-foreground/15'
              )}
            />
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Epoch <span className="font-medium text-foreground/80">{chain.epoch.toLocaleString()}</span> · slot{' '}
        <span className="font-medium text-foreground/80">{Math.max(0, posInEpoch)}</span>/32 this epoch
      </p>
    </div>
  );
}

/** Macro progress toward the activation epoch as a slim bar + endpoints. */
function renderEpochsGrid(
  chain: NonNullable<ChainState>,
  targetEpoch: number,
  slotsRemaining: number,
  epochsRemaining: number,
  network: string
) {
  // Progress across a rolling 2-day window so the bar is meaningful near the end.
  const windowEpochs = Math.max(epochsRemaining, 1) + 24;
  const startEpoch = targetEpoch - windowEpochs;
  const pct = Math.min(100, Math.max(0, ((chain.epoch - startEpoch) / windowEpochs) * 100));
  const hrs = Math.floor((slotsRemaining * SECONDS_PER_SLOT) / 3600);
  return (
    <div className="space-y-2">
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted-foreground/15">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/70 to-primary"
          style={{ width: `${pct}%` }} title={`${network}: ${pct.toFixed(1)}% through the final window`} />
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          epoch <span className="font-mono tabular-nums text-foreground/80">{chain.epoch.toLocaleString()}</span>
        </span>
        <span className="font-medium text-foreground/80">
          {epochsRemaining.toLocaleString()} epochs · {slotsRemaining.toLocaleString()} slots (~{hrs}h) left
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          epoch <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">{targetEpoch.toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
}
