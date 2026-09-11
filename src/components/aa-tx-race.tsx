'use client';

import { useEffect, useState } from 'react';
import { client } from '@/lib/orpc';
import { AnimatedLineRace, LineRaceSkeleton, type RaceSeries } from '@/components/animated-line-race';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pretty = (b: string, g: 'day' | 'week' | 'month' = 'month') => {
  if (!b) return '';
  const d = new Date(`${b.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return b;
  return g === 'month'
    ? d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
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
export function AaTxRace({
  granularity = 'month',
  from,
  to,
}: {
  granularity?: 'day' | 'week' | 'month';
  from?: string;
  to?: string;
}) {
  const [series, setSeries] = useState<RaceSeries[]>([]);
  const [buckets, setBuckets] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 4 && !cancelled; attempt++) {
        try {
          const s = await client.aa.getUsageStats({
            granularity,
            ...(from ? { from } : {}),
            ...(to ? { to } : {}),
          });
          if (cancelled) return;
          if (s && s.series.length) {
            const b = s.series.map((r) => r.bucket.slice(0, 10));
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
        await sleep(2000);
      }
      if (!cancelled) setDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [granularity, from, to]);

  if (buckets.length < 2 || !series.length) {
    return done ? null : (
      <LineRaceSkeleton title="Account abstraction on mainnet" subtitle="Cumulative transactions for selected timeframe" />
    );
  }

  return (
    <AnimatedLineRace
      title="Account abstraction on mainnet"
      subtitle="Cumulative transactions for selected timeframe"
      periodLabel={`${pretty(buckets[0], granularity)} – ${pretty(buckets[buckets.length - 1], granularity)}`}
      series={series}
      buckets={buckets}
      endCards={false}
      footer="EIP-7702 is in-protocol (type 4); ERC-4337 runs off-protocol through the shared EntryPoint. Live from mainnet · EIPsInsight.com"
    />
  );
}
