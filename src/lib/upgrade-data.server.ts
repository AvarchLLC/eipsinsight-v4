import 'server-only';
import { unstable_cache } from 'next/cache';
import { createRouterClient } from '@orpc/server';
import { router } from '@/server/orpc/router';
import type { UpgradeCompositionEip } from '@/components/upgrade/types';

/**
 * Anonymous router client for public upgrade reads in RSC pages. Uses an
 * empty header context (no auth needed for these procedures) so results can
 * be cached with `unstable_cache` — the request-scoped client in
 * `orpc.server.ts` calls `headers()`, which is not allowed inside the cache.
 */
const publicClient = createRouterClient(router, {
  context: () => ({ headers: {} as Record<string, string> }),
});

const REVALIDATE_SECONDS = 300;
// Bump to invalidate all upgrade-surface caches when payload shapes change.
const CACHE_VERSION = 'v3';

export const getCachedUpgrade = unstable_cache(
  async (slug: string) => {
    try {
      return await publicClient.upgrades.getUpgrade({ slug });
    } catch {
      return null;
    }
  },
  ['upgrade-detail', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedUpgradeComposition = unstable_cache(
  async (slug: string): Promise<UpgradeCompositionEip[]> => {
    try {
      return (await publicClient.upgrades.getUpgradeCompositionCurrent({
        slug,
      })) as UpgradeCompositionEip[];
    } catch {
      return [];
    }
  },
  ['upgrade-composition', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedUpgradeEvents = unstable_cache(
  async (slug: string, limit = 50) => {
    try {
      return await publicClient.upgrades.getUpgradeCompositionEvents({ slug, limit });
    } catch {
      return [];
    }
  },
  ['upgrade-events', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedUpgradeTimeline = unstable_cache(
  async (slug: string) => {
    try {
      return await publicClient.upgrades.getUpgradeTimeline({ slug });
    } catch {
      return [];
    }
  },
  ['upgrade-timeline', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedUpgradeList = unstable_cache(
  async () => {
    try {
      return await publicClient.upgrades.listUpgrades({});
    } catch {
      return [];
    }
  },
  ['upgrade-list', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedRecentActivity = unstable_cache(
  async (limit = 15) => {
    try {
      return await publicClient.upgrades.getRecentCompositionActivity({ limit });
    } catch {
      return [];
    }
  },
  ['upgrade-recent-activity', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedRecentCalls = unstable_cache(
  async (limit = 20) => {
    try {
      return await publicClient.calls.listRecentCalls({ limit });
    } catch {
      return [];
    }
  },
  ['protocol-calls-recent', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedRecentDecisions = unstable_cache(
  async (limit = 12) => {
    try {
      return await publicClient.calls.listRecentDecisions({ limit });
    } catch {
      return [];
    }
  },
  ['protocol-calls-decisions', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedUpcomingCalls = unstable_cache(
  async () => {
    try {
      return await publicClient.calls.listUpcomingCalls({});
    } catch {
      return [];
    }
  },
  ['protocol-calls-upcoming', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedCall = unstable_cache(
  async (series: string, number: string) => {
    try {
      return await publicClient.calls.getCall({ series, number });
    } catch {
      return null;
    }
  },
  ['protocol-call-detail', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedCallNeighbors = unstable_cache(
  async (series: string, occurredOn: string) => {
    try {
      return await publicClient.calls.getCallNeighbors({ series, occurredOn });
    } catch {
      return { prev: null, next: null };
    }
  },
  ['protocol-call-neighbors', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedDevnetList = unstable_cache(
  async () => {
    try {
      return await publicClient.devnets.listDevnets({});
    } catch {
      return [];
    }
  },
  ['devnet-list', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedClientPriority = unstable_cache(
  async (slug: string) => {
    try {
      return await publicClient.clientPriority.getClientPriority({ slug });
    } catch {
      return null;
    }
  },
  ['client-priority'],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedDevnetMatrix = unstable_cache(
  async (series: string[]) => {
    try {
      return await publicClient.devnets.getSeriesEipMatrix({ series });
    } catch {
      return [];
    }
  },
  ['devnet-matrix', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export const getCachedDevnet = unstable_cache(
  async (id: string) => {
    try {
      return await publicClient.devnets.getDevnet({ id });
    } catch {
      return null;
    }
  },
  ['devnet-detail', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);

export interface SteelComplexity {
  eip: number;
  total: number | null;
  tier: 'Low' | 'Medium' | 'High' | null;
  url: string;
}

/**
 * Testing-complexity assessments from the STEEL team's repo
 * (github.com/ethsteel/pm, complexity_assessments/EIPs/*.md). Fetched and
 * parsed server-side, cached for an hour; empty array on any failure.
 */
export const getCachedSteelComplexity = unstable_cache(
  async (): Promise<SteelComplexity[]> => {
    try {
      const listing = await fetch(
        'https://api.github.com/repos/ethsteel/pm/contents/complexity_assessments/EIPs',
        {
          headers: { Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(20_000),
        }
      );
      if (!listing.ok) return [];
      const files = (await listing.json()) as Array<{
        name: string;
        download_url: string;
        html_url: string;
      }>;

      const results: SteelComplexity[] = [];
      for (const file of files.filter((f) => /eip-?\d+.*\.md$/i.test(f.name)).slice(0, 60)) {
        const eipMatch = file.name.match(/eip-?(\d+)/i);
        if (!eipMatch) continue;
        const eip = Number.parseInt(eipMatch[1], 10);

        let total: number | null = null;
        try {
          const response = await fetch(file.download_url, { signal: AbortSignal.timeout(15_000) });
          if (response.ok) {
            const markdown = await response.text();
            const totalMatch =
              markdown.match(/\*\*Total:?\**\s*:?\s*\**\s*(\d+)/i) ??
              markdown.match(/Total(?:\s*Score)?\s*[:|]\s*\**\s*(\d+)/i);
            if (totalMatch) total = Number.parseInt(totalMatch[1], 10);
          }
        } catch {
          // Leave total null; the assessment link still renders.
        }

        results.push({
          eip,
          total,
          tier: total == null ? null : total < 10 ? 'Low' : total < 20 ? 'Medium' : 'High',
          url: file.html_url,
        });
      }
      return results;
    } catch {
      return [];
    }
  },
  ['steel-complexity', CACHE_VERSION],
  { revalidate: 3600 }
);

export const getCachedUpgradeStats = unstable_cache(
  async () => {
    try {
      return await publicClient.upgrades.getUpgradeStats({});
    } catch {
      return null;
    }
  },
  ['upgrade-stats', CACHE_VERSION],
  { revalidate: REVALIDATE_SECONDS }
);
