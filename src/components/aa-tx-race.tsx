'use client';

import { useEffect, useState } from 'react';
import { client } from '@/lib/orpc';
import { AnimatedLineRace, LineRaceSkeleton, type RaceSeries } from '@/components/animated-line-race';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pretty = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
};
const cumsum = (a: number[]) => {
  let t = 0;
  return a.map((v) => (t += v));
};

/**
 * WatcherGuru-style animated line race of account-abstraction transactions on
 * mainnet since Pectra: cumulative EIP-7702 (type 4) vs the ERC-4337 EntryPoint
 * versions. Lines draw left-to-right and totals count up on scroll-in.
 */
export function AaTxRace() {
  const [series, setSeries] = useState<RaceSeries[]>([]);
  const [buckets, setBuckets] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The per-EntryPoint series query is heavy (~8s cold) and can time out under
    // load, returning empty. Retry a few times with backoff before giving up so
    // the chart reliably fills in without a manual reload.
    (async () => {
      for (let attempt = 0; attempt < 4 && !cancelled; attempt++) {
        try {
          const s = await client.aa.getUsageStats({ granularity: 'month', from: '2025-05-01' });
          if (cancelled) return;
          if (s && s.series.length) {
            const b = s.series.map((r) => r.bucket.slice(0, 7));
            const line = (key: string, label: string, sub: string, color: string, pick: (r: (typeof s.series)[number]) => number) => ({
              key,
              label,
              sub,
              color,
              points: cumsum(s.series.map(pick)),
            });
            const next: RaceSeries[] = [
              line('7702', 'EIP-7702', 'Set EOA code · type 4', 'var(--chart-1)', (r) => r.aa7702),
              line('ep07', 'ERC-4337 v0.7', 'EntryPoint v0.7', 'var(--chart-4)', (r) => r.ep07),
              line('ep06', 'ERC-4337 v0.6', 'EntryPoint v0.6', 'var(--chart-5)', (r) => r.ep06),
              line('ep08', 'ERC-4337 v0.8', 'EntryPoint v0.8', 'var(--chart-2)', (r) => r.ep08),
            ].filter((l) => l.points[l.points.length - 1] > 0);
            setBuckets(b);
            setSeries(next);
            break;
          }
        } catch {
          // ignore and retry
        }
        await sleep(2500);
      }
      if (!cancelled) setDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (buckets.length < 2 || !series.length) {
    // Still trying → skeleton; gave up (e.g. ClickHouse down) → render nothing.
    return done ? null : (
      <LineRaceSkeleton title="Account abstraction on mainnet" subtitle="Cumulative transactions since Pectra" />
    );
  }

  return (
    <AnimatedLineRace
      title="Account abstraction on mainnet"
      subtitle="Cumulative transactions since Pectra"
      periodLabel={`${pretty(buckets[0])} – ${pretty(buckets[buckets.length - 1])}`}
      series={series}
      buckets={buckets}
      footer="EIP-7702 is in-protocol (type 4); ERC-4337 runs off-protocol through the shared EntryPoint. Live from mainnet · EIPsInsight.com"
    />
  );
}
