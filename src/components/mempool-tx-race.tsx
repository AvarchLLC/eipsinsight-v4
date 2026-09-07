'use client';

import { useEffect, useState } from 'react';
import { client } from '@/lib/orpc';
import { AnimatedLineRace, LineRaceSkeleton, type RaceSeries } from '@/components/animated-line-race';

const COLORS = ['var(--chart-1)', 'var(--chart-4)', 'var(--chart-2)', 'var(--chart-5)', 'var(--chart-3)'];
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
 * WatcherGuru-style animated line race of every mainnet transaction by type:
 * cumulative EIP-1559 vs legacy vs EIP-4844 blob vs EIP-7702 vs EIP-2930 over
 * the last two years. Lines draw left-to-right and totals count up on scroll-in.
 */
export function MempoolTxRace({ months = 24 }: { months?: number }) {
  const [series, setSeries] = useState<RaceSeries[]>([]);
  const [buckets, setBuckets] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client.network
      .getTxTypeSeries({ months })
      .then((s) => {
        if (cancelled || !s || !s.buckets.length || !s.series.length) return;
        setBuckets(s.buckets);
        setSeries(
          s.series.map((t, i) => ({
            key: String(t.txType),
            label: t.label,
            sub: t.sub,
            color: COLORS[i % COLORS.length],
            points: cumsum(t.counts),
          })),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, [months]);

  if (buckets.length < 2 || !series.length) {
    return done ? null : (
      <LineRaceSkeleton title="Mainnet transactions by type" subtitle="Cumulative count by the EIP that introduced each format" />
    );
  }

  return (
    <AnimatedLineRace
      title="Mainnet transactions by type"
      subtitle="Cumulative count by the EIP that introduced each format"
      periodLabel={`${pretty(buckets[0])} – ${pretty(buckets[buckets.length - 1])}`}
      series={series}
      buckets={buckets}
      footer="EIP-1559 dynamic-fee transactions dominate; EIP-7702 is the newest type, live since Pectra. Live from mainnet · EIPsInsight.com"
    />
  );
}
