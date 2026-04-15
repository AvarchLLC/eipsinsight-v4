import { optionalAuthProcedure, requireTier } from './types'

import { prisma } from '@/lib/prisma'
import {
  CANONICAL_EIP_EDITORS,
  CANONICAL_EIP_EDITOR_LOWER,
  CANONICAL_EIP_REVIEWERS,
  CANONICAL_EIP_REVIEWER_LOWER,
  OFFICIAL_EDITORS_BY_CATEGORY,
} from '@/data/eip-contributor-roles'
import * as z from 'zod'
import { unstable_cache } from 'next/cache'

const repoFilterSchema = z.object({
  repo: z.enum(['eips', 'ercs', 'rips']).optional(),
});

// Cached helpers for heavy analytics queries

const getEIPHeroKPIsCached = unstable_cache(
  async (repo: string | null, periodStart: string) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      active: bigint;
      new_drafts: bigint;
      finalized: bigint;
      stagnant: bigint;
    }>>(
      `
      WITH period_start AS (
        SELECT $2::date as start_date
      )
      SELECT
        COUNT(*) FILTER (WHERE s.status IN ('Draft', 'Review', 'Last Call'))::bigint as active,
        COUNT(*) FILTER (WHERE s.status = 'Draft' AND e.created_at >= (SELECT start_date FROM period_start))::bigint as new_drafts,
        COUNT(DISTINCT CASE WHEN se.to_status = 'Final' AND se.changed_at >= (SELECT start_date FROM period_start) THEN se.eip_id END)::bigint as finalized,
        COUNT(*) FILTER (WHERE s.status = 'Stagnant')::bigint as stagnant
      FROM eip_snapshots s
      JOIN eips e ON s.eip_id = e.id
      LEFT JOIN repositories r ON s.repository_id = r.id
      LEFT JOIN eip_status_events se ON se.eip_id = s.eip_id AND se.to_status = 'Final'
      WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
    `,
      repo,
      periodStart
    );

    const row = results[0] || {
      active: BigInt(0),
      new_drafts: BigInt(0),
      finalized: BigInt(0),
      stagnant: BigInt(0),
    };

    return {
      active: Number(row.active),
      newDrafts: Number(row.new_drafts),
      finalized: Number(row.finalized),
      stagnant: Number(row.stagnant),
    };
  },
  ['analytics-getEIPHeroKPIs'],
  { tags: ['analytics-eips-hero'], revalidate: 300 }
);

const getPRMonthlyActivityCached = unstable_cache(
  async (repo: string | null, from: string | null, to: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      month: string;
      created: bigint;
      merged: bigint;
      closed: bigint;
      open_at_month_end: bigint;
    }>>(`
      WITH pr_base AS (
        SELECT 
          pr.pr_number,
          pr.repository_id,
          r.name as repo,
          pr.created_at,
          pr.merged_at,
          pr.closed_at,
          pr.state
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE pr.created_at >= '2015-01-01'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
      ),
      -- Generate all months from first PR to current month
      month_series AS (
        SELECT 
          TO_CHAR(month_start, 'YYYY-MM') as month,
          month_start as month_date
        FROM generate_series(
          (SELECT DATE_TRUNC('month', MIN(created_at)) FROM pr_base WHERE ($2::text IS NULL OR TO_CHAR(created_at, 'YYYY-MM') >= $2)),
          CASE 
            WHEN $3::text IS NOT NULL THEN TO_DATE($3 || '-01', 'YYYY-MM-DD')
            ELSE DATE_TRUNC('month', CURRENT_DATE)
          END,
          '1 month'::interval
        ) AS month_start
      ),
      -- PRs created per month
      monthly_created AS (
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*)::bigint as created
        FROM pr_base
        WHERE ($2::text IS NULL OR TO_CHAR(created_at, 'YYYY-MM') >= $2)
          AND ($3::text IS NULL OR TO_CHAR(created_at, 'YYYY-MM') <= $3)
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ),
      -- PRs merged per month
      monthly_merged AS (
        SELECT 
          TO_CHAR(merged_at, 'YYYY-MM') as month,
          COUNT(*)::bigint as merged
        FROM pr_base
        WHERE merged_at IS NOT NULL
          AND ($2::text IS NULL OR TO_CHAR(merged_at, 'YYYY-MM') >= $2)
          AND ($3::text IS NULL OR TO_CHAR(merged_at, 'YYYY-MM') <= $3)
        GROUP BY TO_CHAR(merged_at, 'YYYY-MM')
      ),
      -- PRs closed (not merged) per month
      monthly_closed AS (
        SELECT 
          TO_CHAR(closed_at, 'YYYY-MM') as month,
          COUNT(*)::bigint as closed
        FROM pr_base
        WHERE closed_at IS NOT NULL 
          AND merged_at IS NULL
          AND ($2::text IS NULL OR TO_CHAR(closed_at, 'YYYY-MM') >= $2)
          AND ($3::text IS NULL OR TO_CHAR(closed_at, 'YYYY-MM') <= $3)
        GROUP BY TO_CHAR(closed_at, 'YYYY-MM')
      ),
      -- PRs open at end of each month (FIXED LOGIC)
      monthly_open_counts AS (
        SELECT 
          ms.month,
          COUNT(pb.pr_number)::bigint as open_at_month_end
        FROM month_series ms
        LEFT JOIN pr_base pb ON 
          -- PR was created before or during this month
          pb.created_at <= (ms.month_date + INTERVAL '1 month' - INTERVAL '1 day')
          -- AND PR was NOT merged before end of month (or never merged)
          AND (pb.merged_at IS NULL OR pb.merged_at > (ms.month_date + INTERVAL '1 month' - INTERVAL '1 day'))
          -- AND PR was NOT closed before end of month (or never closed)
          AND (pb.closed_at IS NULL OR pb.closed_at > (ms.month_date + INTERVAL '1 month' - INTERVAL '1 day'))
        GROUP BY ms.month, ms.month_date
      ),
      -- Current month open count (SPECIAL CASE)
      current_month_open AS (
        SELECT 
          TO_CHAR(CURRENT_DATE, 'YYYY-MM') as month,
          COUNT(*)::bigint as open_now
        FROM pr_base
        WHERE state = 'open'
      )
      SELECT 
        ms.month,
        COALESCE(mc.created, 0::bigint) as created,
        COALESCE(mm.merged, 0::bigint) as merged,
        COALESCE(mcl.closed, 0::bigint) as closed,
        -- Use current open count for current month, historical open_at_month_end for past months
        CASE 
          WHEN ms.month = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN COALESCE(cmo.open_now, 0::bigint)
          ELSE COALESCE(moc.open_at_month_end, 0::bigint)
        END as open_at_month_end
      FROM month_series ms
      LEFT JOIN monthly_created mc ON ms.month = mc.month
      LEFT JOIN monthly_merged mm ON ms.month = mm.month
      LEFT JOIN monthly_closed mcl ON ms.month = mcl.month
      LEFT JOIN monthly_open_counts moc ON ms.month = moc.month
      LEFT JOIN current_month_open cmo ON ms.month = cmo.month
      WHERE ($2::text IS NULL OR ms.month >= $2)
        AND ($3::text IS NULL OR ms.month <= $3)
      ORDER BY ms.month ASC
    `, repo ?? null, from ?? null, to ?? null);

    return results.map(r => ({
      month: r.month,
      created: Number(r.created),
      merged: Number(r.merged),
      closed: Number(r.closed),
      openAtMonthEnd: Number(r.open_at_month_end),
    }));
  },
  ['analytics-getPRMonthlyActivity'],
  { tags: ['analytics-prs-monthly'], revalidate: 600 }
);

const getPROpenStateCached = unstable_cache(
  async (repo: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      total_open: bigint;
      median_age: number | null;
      pr_number: number | null;
      title: string | null;
      author: string | null;
      age_days: number | null;
      repo_name: string | null;
    }>>(`
      WITH open_prs AS (
        SELECT
          pr.pr_number,
          pr.title,
          pr.author,
          pr.created_at,
          EXTRACT(DAY FROM (NOW() - pr.created_at))::int AS age_days,
          r.name AS repo_name
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE pr.state = 'open'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
      ),
      stats AS (
        SELECT
          COUNT(*)::bigint AS total_open,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY age_days)::numeric AS median_age
        FROM open_prs
      ),
      oldest AS (
        SELECT
          pr_number,
          title,
          author,
          age_days,
          repo_name
        FROM open_prs
        ORDER BY created_at ASC
        LIMIT 1
      )
      SELECT
        s.total_open,
        s.median_age,
        o.pr_number,
        o.title,
        o.author,
        o.age_days,
        o.repo_name
      FROM stats s
      LEFT JOIN oldest o ON TRUE
    `, repo);

    const row = results[0];
    return {
      totalOpen: Number(row?.total_open ?? 0),
      medianAge: Math.round(Number(row?.median_age ?? 0)),
      oldestPR: row?.pr_number
        ? {
            pr_number: row.pr_number,
            title: row.title ?? "",
            author: row.author ?? "",
            age_days: Number(row.age_days ?? 0),
            repo: row.repo_name ?? "",
          }
        : null,
    };
  },
  ['analytics-getPROpenState'],
  { tags: ['analytics-prs-open-state'], revalidate: 120 }
);

const getPRMonthHeroKPIsCached = unstable_cache(
  async (repo: string | null, monthStr: string) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      open_prs: bigint;
      new_prs: bigint;
      merged_prs: bigint;
      closed_unmerged: bigint;
    }>>(`
      WITH pr_base AS (
        SELECT pr.pr_number, pr.repository_id, pr.created_at, pr.merged_at, pr.closed_at, pr.state
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE pr.created_at >= '2015-01-01'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
      ),
      month_bounds AS (
        SELECT
          ($2::text || '-01')::date AS month_start,
          (($2::text || '-01')::date + INTERVAL '1 month' - INTERVAL '1 day')::timestamp AS month_end
      ),
      open_at_month_end AS (
        SELECT COUNT(*)::bigint AS cnt FROM pr_base pb
        CROSS JOIN month_bounds m
        WHERE pb.created_at <= m.month_end
          AND (pb.merged_at IS NULL OR pb.merged_at > m.month_end)
          AND (pb.closed_at IS NULL OR pb.closed_at > m.month_end)
      ),
      new_in_month AS (
        SELECT COUNT(*)::bigint AS cnt FROM pr_base pb
        CROSS JOIN month_bounds m
        WHERE pb.created_at >= m.month_start AND pb.created_at <= m.month_end
      ),
      merged_in_month AS (
        SELECT COUNT(*)::bigint AS cnt FROM pr_base pb
        CROSS JOIN month_bounds m
        WHERE pb.merged_at IS NOT NULL AND pb.merged_at >= m.month_start AND pb.merged_at <= m.month_end
      ),
      closed_unmerged_in_month AS (
        SELECT COUNT(*)::bigint AS cnt FROM pr_base pb
        CROSS JOIN month_bounds m
        WHERE pb.closed_at IS NOT NULL AND pb.merged_at IS NULL
          AND pb.closed_at >= m.month_start AND pb.closed_at <= m.month_end
      )
      SELECT
        (SELECT cnt FROM open_at_month_end) AS open_prs,
        (SELECT cnt FROM new_in_month) AS new_prs,
        (SELECT cnt FROM merged_in_month) AS merged_prs,
        (SELECT cnt FROM closed_unmerged_in_month) AS closed_unmerged
    `, repo, monthStr);

    const r = results[0];
    const openPRs = Number(r?.open_prs ?? 0);
    const newPRs = Number(r?.new_prs ?? 0);
    const mergedPRs = Number(r?.merged_prs ?? 0);
    const closedUnmerged = Number(r?.closed_unmerged ?? 0);
    const netDelta = newPRs - mergedPRs - closedUnmerged;

    return {
      month: monthStr,
      openPRs,
      newPRs,
      mergedPRs,
      closedUnmerged,
      netDelta,
    };
  },
  ['analytics-getPRMonthHeroKPIs'],
  { tags: ['analytics-prs-month-hero'], revalidate: 120 }
);

function isConnectionSaturationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("max_client_conn") ||
    message.includes("no more connections allowed") ||
    message.includes("P2037") ||
    message.includes("08P01")
  );
}

const getContributorKPIsCached = unstable_cache(
  async () => {
    const results = await prisma.$queryRaw<Array<{
      total_contributors: bigint;
      active_30d: bigint;
      total_activities: bigint;
      last_24h: bigint;
    }>>`
      SELECT
        (SELECT COUNT(DISTINCT actor) FROM contributor_activity)::bigint AS total_contributors,
        (SELECT COUNT(DISTINCT actor) FROM contributor_activity WHERE occurred_at >= NOW() - INTERVAL '30 days')::bigint AS active_30d,
        (SELECT COUNT(*)::bigint FROM contributor_activity) AS total_activities,
        (SELECT COUNT(*)::bigint FROM contributor_activity WHERE occurred_at >= NOW() - INTERVAL '24 hours') AS last_24h
    `;
    const r = results[0];
    return {
      totalContributors: Number(r?.total_contributors ?? 0),
      activeContributors30d: Number(r?.active_30d ?? 0),
      totalActivities: Number(r?.total_activities ?? 0),
      last24hCount: Number(r?.last_24h ?? 0),
    };
  },
  ['analytics-getContributorKPIs'],
  { tags: ['analytics-contributors-kpis'], revalidate: 300 }
);

export const getLifecycleDataCached = unstable_cache(
  async (repo: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      stage: string;
      count: bigint;
      color: string;
      opacity: string;
    }>>(
      `
      SELECT 
        s.status as stage, 
        COUNT(*) as count,
        CASE 
          WHEN s.status IN ('Draft', 'Review', 'Last Call') THEN 'cyan'
          WHEN s.status = 'Final' THEN 'emerald'
          WHEN s.status = 'Stagnant' THEN 'slate'
          WHEN s.status = 'Withdrawn' THEN 'red'
          ELSE 'blue' 
        END as color,
        CASE 
          WHEN s.status IN ('Withdrawn', 'Stagnant') THEN 'dim'
          ELSE 'bright'
        END as opacity
      FROM eip_snapshots s
      LEFT JOIN repositories r ON s.repository_id = r.id
      WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
      GROUP BY s.status
      ORDER BY count DESC
    `,
      repo
    );

    return results.map(r => ({
      stage: r.stage,
      count: Number(r.count),
      color: r.color,
      opacity: r.opacity
    }));
  },
  ['analytics-getLifecycleData'],
  { tags: ['analytics-eips-lifecycle'], revalidate: 600 }
);

export const getStandardsCompositionCached = unstable_cache(
  async (repo: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      type: string;
      category: string | null;
      repository: string | null;
      count: bigint;
      percentage: number;
      color: string;
    }>>(
      `
      WITH filtered AS (
        SELECT s.type, s.category, r.name AS repository
        FROM eip_snapshots s
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
      ),
      total AS (SELECT COUNT(*)::float AS n FROM filtered)
      SELECT
        type,
        COALESCE(category, 'Core') as category,
        repository,
        COUNT(*)::bigint as count,
        ROUND((COUNT(*) * 100.0 / (SELECT n FROM total))::numeric, 1) as percentage,
        CASE 
          WHEN type = 'Standards Track' AND category = 'Core' AND (repository IS NULL OR repository NOT LIKE '%RIPs%') THEN 'emerald'
          WHEN type = 'Standards Track' AND category = 'ERC' THEN 'blue'
          WHEN type = 'Meta' THEN 'violet'
          WHEN repository LIKE '%RIPs%' THEN 'slate'
          ELSE 'slate'
        END as color
      FROM filtered
      GROUP BY type, category, repository
      ORDER BY count DESC
    `,
      repo
    );

    return results.map(r => ({
      type: r.type,
      category: r.category || 'Core',
      repository: r.repository ?? undefined,
      count: Number(r.count),
      percentage: Number(r.percentage),
      color: r.color
    }));
  },
  ['analytics-getStandardsComposition'],
  { tags: ['analytics-eips-composition'], revalidate: 600 }
);

const getEIPStatusTransitionsCached = unstable_cache(
  async (repo: string | null, from: string | null, to: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      from_status: string;
      to_status: string;
      count: bigint;
    }>>(
      `
      SELECT
        se.from_status,
        se.to_status,
        COUNT(*)::bigint as count
      FROM eip_status_events se
      LEFT JOIN repositories r ON se.repository_id = r.id
      WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        AND ($2::date IS NULL OR se.changed_at >= $2)
        AND ($3::date IS NULL OR se.changed_at <= $3)
        AND se.from_status IS NOT NULL
        AND se.to_status IS NOT NULL
      GROUP BY se.from_status, se.to_status
      ORDER BY count DESC
    `,
      repo,
      from,
      to
    );

    return results.map(r => ({
      from: r.from_status,
      to: r.to_status,
      value: Number(r.count),
    }));
  },
  ['analytics-getEIPStatusTransitions'],
  { tags: ['analytics-eips-transitions'], revalidate: 600 }
);

const getEIPThroughputCached = unstable_cache(
  async (repo: string | null, monthsParam: number) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      month: string;
      status: string;
      count: bigint;
    }>>(
      `
      SELECT
        TO_CHAR(date_trunc('month', se.changed_at), 'YYYY-MM') as month,
        se.to_status as status,
        COUNT(*)::bigint as count
      FROM eip_status_events se
      LEFT JOIN repositories r ON se.repository_id = r.id
      WHERE se.changed_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $2)
        AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        AND se.to_status IN ('Draft', 'Review', 'Last Call', 'Final')
      GROUP BY date_trunc('month', se.changed_at), se.to_status
      ORDER BY month ASC, status ASC
    `,
      repo,
      monthsParam - 1
    );

    const grouped: Record<string, Record<string, number>> = {};
    results.forEach(r => {
      if (!grouped[r.month]) {
        grouped[r.month] = {};
      }
      grouped[r.month][r.status] = Number(r.count);
    });

    return Object.entries(grouped).map(([month, statuses]) => ({
      month,
      draft: statuses['Draft'] || 0,
      review: statuses['Review'] || 0,
      lastCall: statuses['Last Call'] || 0,
      final: statuses['Final'] || 0,
    }));
  },
  ['analytics-getEIPThroughput'],
  { tags: ['analytics-eips-throughput'], revalidate: 600 }
);

const getPRTimeToOutcomeCached = unstable_cache(
  async (repo: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      metric: string;
      median_days: number;
      p75_days: number;
      p90_days: number;
    }>>(
      `
      WITH pr_metadata AS (
        SELECT 
          pr.pr_number,
          r.name as repo,
          pr.created_at,
          pr.merged_at,
          pr.closed_at,
          MIN(CASE WHEN ca.action_type = 'reviewed' THEN ca.occurred_at END) AS first_review,
          MIN(CASE WHEN ca.action_type IN ('commented', 'issue_comment') THEN ca.occurred_at END) AS first_comment
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        LEFT JOIN contributor_activity ca ON ca.pr_number = pr.pr_number AND ca.repository_id = pr.repository_id
        WHERE pr.created_at >= '2015-01-01'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY pr.pr_number, r.name, pr.created_at, pr.merged_at, pr.closed_at
      )
      SELECT 
        'first_review' as metric,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (first_review - created_at)))::numeric as median_days,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (first_review - created_at)))::numeric as p75_days,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (first_review - created_at)))::numeric as p90_days
      FROM pr_metadata
      WHERE first_review IS NOT NULL
      UNION ALL
      SELECT 
        'first_comment' as metric,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (first_comment - created_at)))::numeric,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (first_comment - created_at)))::numeric,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (first_comment - created_at)))::numeric
      FROM pr_metadata
      WHERE first_comment IS NOT NULL
      UNION ALL
      SELECT 
        'merge' as metric,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (merged_at - created_at)))::numeric,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (merged_at - created_at)))::numeric,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (merged_at - created_at)))::numeric
      FROM pr_metadata
      WHERE merged_at IS NOT NULL
      UNION ALL
      SELECT 
        'close' as metric,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (closed_at - created_at)))::numeric,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (closed_at - created_at)))::numeric,
        PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (closed_at - created_at)))::numeric
      FROM pr_metadata
      WHERE closed_at IS NOT NULL AND merged_at IS NULL
    `,
      repo
    );

    return results.map(r => ({
      metric: r.metric,
      medianDays: Math.round(Number(r.median_days || 0)),
      p75Days: Math.round(Number(r.p75_days || 0)),
      p90Days: Math.round(Number(r.p90_days || 0)),
    }));
  },
  ['analytics-getPRTimeToOutcome'],
  { tags: ['analytics-prs-time-to-outcome'], revalidate: 900 }
);

const getPRStalenessCached = unstable_cache(
  async (repo: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      bucket: string;
      count: bigint;
    }>>(
      `
      WITH open_prs AS (
        SELECT 
          pr.pr_number,
          pr.title,
          pr.author,
          r.name as repo,
          EXTRACT(DAY FROM (NOW() - pr.created_at))::int as age_days,
          CASE 
            WHEN EXTRACT(DAY FROM (NOW() - pr.created_at)) <= 7 THEN '0-7 days'
            WHEN EXTRACT(DAY FROM (NOW() - pr.created_at)) <= 30 THEN '7-30 days'
            WHEN EXTRACT(DAY FROM (NOW() - pr.created_at)) <= 90 THEN '30-90 days'
            ELSE '90+ days'
          END as bucket
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE pr.state = 'open'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
      )
      SELECT 
        bucket,
        COUNT(*)::bigint as count
      FROM open_prs
      GROUP BY bucket
      ORDER BY 
        CASE bucket
          WHEN '0-7 days' THEN 1
          WHEN '7-30 days' THEN 2
          WHEN '30-90 days' THEN 3
          WHEN '90+ days' THEN 4
        END
    `,
      repo
    );

    return results.map(r => ({
      bucket: r.bucket,
      count: Number(r.count),
    }));
  },
  ['analytics-getPRStaleness'],
  { tags: ['analytics-prs-staleness'], revalidate: 300 }
);

const getPRGovernanceStatesCached = unstable_cache(
  async (repo: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      state: string;
      label: string;
      count: bigint;
    }>>(`
      WITH pr_metadata AS (
        SELECT 
          pr.pr_number,
          r.name as repo,
          pr.title,
          pr.author,
          CASE 
            WHEN pr.merged_at IS NOT NULL THEN 'merged'
            WHEN pr.state = 'open' THEN 'open'
            ELSE 'closed'
          END as state,
          COALESCE(gs.current_state, 'NO_STATE') as governance_state
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        LEFT JOIN pr_governance_state gs ON pr.pr_number = gs.pr_number AND pr.repository_id = gs.repository_id
        WHERE pr.state = 'open'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
      ),
      governance_mapping AS (
        SELECT 'WAITING_ON_EDITOR' as state, 'waiting for editors review' as label UNION ALL
        SELECT 'WAITING_ON_AUTHOR', 'author review' UNION ALL
        SELECT 'STALLED', 'stalled' UNION ALL
        SELECT 'DRAFT', 'draft' UNION ALL
        SELECT 'NO_STATE', 'uncategorized'
      )
      SELECT 
        pm.governance_state as state,
        COALESCE(gm.label, pm.governance_state) as label,
        COUNT(*)::bigint as count
      FROM pr_metadata pm
      LEFT JOIN governance_mapping gm ON pm.governance_state = gm.state
      GROUP BY pm.governance_state, gm.label
      ORDER BY count DESC
    `, repo || null);

    return results.map(r => ({
      state: r.state,
      label: r.label,
      count: Number(r.count),
    }));
  },
  ['analytics-getPRGovernanceStates'],
  { tags: ['analytics-prs-governance'], revalidate: 300 }
);

const getContributorActivityByTypeCached = unstable_cache(
  async (repo: string | null, from: string | null, to: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{ action_type: string; count: bigint }>>(
      `
      SELECT ca.action_type, COUNT(*)::bigint AS count
      FROM contributor_activity ca
      LEFT JOIN repositories r ON r.id = ca.repository_id
      WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        AND ($2::text IS NULL OR ca.occurred_at >= $2::timestamp)
        AND ($3::text IS NULL OR ca.occurred_at <= $3::timestamp)
      GROUP BY ca.action_type
      ORDER BY count DESC
    `,
      repo ?? null,
      from ?? null,
      to ?? null
    );
    return results.map((r) => ({ actionType: r.action_type, count: Number(r.count) }));
  },
  ['analytics-getContributorActivityByType'],
  { tags: ['analytics-contributors-activity-type'], revalidate: 600 }
);

const getContributorActivityByRepoCached = unstable_cache(
  async (from: string | null, to: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{ repo: string; count: bigint }>>(
      `
      SELECT COALESCE(r.name, 'Unknown') AS repo, COUNT(*)::bigint AS count
      FROM contributor_activity ca
      LEFT JOIN repositories r ON r.id = ca.repository_id
      WHERE ($1::text IS NULL OR ca.occurred_at >= $1::timestamp)
        AND ($2::text IS NULL OR ca.occurred_at <= $2::timestamp)
      GROUP BY r.name
      ORDER BY count DESC
    `,
      from ?? null,
      to ?? null
    );
    return results.map((r) => ({ repo: r.repo ?? 'Unknown', count: Number(r.count) }));
  },
  ['analytics-getContributorActivityByRepo'],
  { tags: ['analytics-contributors-activity-repo'], revalidate: 600 }
);

// ——— Cached helpers for Editors & Reviewers analytics ———

const getEditorsLeaderboardCached = unstable_cache(
  async (repo: string | null, from: string | null, to: string | null, limit: number) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      actor: string;
      total_actions: bigint;
      prs_touched: bigint;
      reviews: bigint;
      comments: bigint;
      median_response_days: number | null;
      latest_occurred_at: Date | null;
    }>>(
      `
      WITH editor_map AS (
        SELECT canonical, actor_lc
        FROM UNNEST($5::text[], $6::text[]) AS x(canonical, actor_lc)
      ),
      raw_events AS (
        SELECT
          em.canonical AS actor,
          pe.pr_number,
          pe.repository_id,
          pe.event_type,
          CASE
            WHEN pe.created_at > COALESCE(pr.closed_at, pr.merged_at, NOW()) + INTERVAL '30 days'
              THEN COALESCE(pr.closed_at, pr.merged_at, pr.created_at, pe.created_at)
            ELSE pe.created_at
          END AS occurred_at
        FROM pr_events pe
        JOIN editor_map em ON LOWER(pe.actor) = em.actor_lc
        LEFT JOIN pull_requests pr ON pr.pr_number = pe.pr_number AND pr.repository_id = pe.repository_id
        LEFT JOIN repositories r ON r.id = pe.repository_id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND pe.pr_number > 0
          AND pe.event_type NOT IN ('subscribed', 'mentioned', 'referenced')
      ),
      deduped_events AS (
        SELECT
          actor,
          pr_number,
          repository_id,
          event_type,
          date_trunc('second', occurred_at) AS occurred_at
        FROM raw_events
        GROUP BY actor, pr_number, repository_id, event_type, date_trunc('second', occurred_at)
      ),
      editor_activity AS (
        SELECT actor, pr_number, repository_id, event_type, occurred_at
        FROM deduped_events
        WHERE ($2::text IS NULL OR occurred_at >= $2::timestamp)
          AND ($3::text IS NULL OR occurred_at < (($3::date + INTERVAL '1 day')::timestamp))
      ),
      by_actor AS (
        SELECT
          actor,
          COUNT(*)::bigint AS total_actions,
          COUNT(DISTINCT CONCAT(repository_id::text, ':', pr_number::text))::bigint AS prs_touched,
          COUNT(*) FILTER (WHERE event_type IN ('reviewed', 'approved', 'changes_requested'))::bigint AS reviews,
          COUNT(*) FILTER (WHERE event_type IN ('commented', 'issue_comment', 'review_comment'))::bigint AS comments,
          MAX(occurred_at) AS latest_occurred_at
        FROM editor_activity GROUP BY actor
      ),
      first_review AS (
        SELECT ea.actor, ea.pr_number, ea.repository_id, MIN(ea.occurred_at) AS first_at
        FROM editor_activity ea
        WHERE ea.event_type IN ('reviewed', 'approved', 'changes_requested', 'commented', 'issue_comment', 'review_comment')
        GROUP BY ea.actor, ea.pr_number, ea.repository_id
      ),
      response_days AS (
        SELECT fr.actor, EXTRACT(DAY FROM (fr.first_at - pr.created_at))::int AS days
        FROM first_review fr
        JOIN pull_requests pr ON pr.pr_number = fr.pr_number AND pr.repository_id = fr.repository_id
      ),
      medians AS (
        SELECT actor, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days)::numeric AS median_response_days
        FROM response_days GROUP BY actor
      )
      SELECT
        em.canonical AS actor,
        COALESCE(ba.total_actions, 0::bigint) AS total_actions,
        COALESCE(ba.prs_touched, 0::bigint) AS prs_touched,
        COALESCE(ba.reviews, 0::bigint) AS reviews,
        COALESCE(ba.comments, 0::bigint) AS comments,
        ba.latest_occurred_at,
        m.median_response_days
      FROM editor_map em
      LEFT JOIN by_actor ba ON ba.actor = em.canonical
      LEFT JOIN medians m ON m.actor = em.canonical
      ORDER BY COALESCE(ba.total_actions, 0::bigint) DESC, COALESCE(ba.prs_touched, 0::bigint) DESC, em.canonical ASC
      LIMIT $4
    `,
      repo,
      from,
      to,
      limit,
      Array.from(CANONICAL_EIP_EDITORS),
      CANONICAL_EIP_EDITOR_LOWER
    );
    return results.map((r) => ({
      actor: r.actor,
      totalActions: Number(r.total_actions),
      prsTouched: Number(r.prs_touched),
      reviews: Number(r.reviews),
      comments: Number(r.comments),
      medianResponseDays: r.median_response_days != null ? Math.round(Number(r.median_response_days)) : null,
      updatedAt: r.latest_occurred_at?.toISOString() ?? null,
    }));
  },
  ['analytics-getEditorsLeaderboard'],
  { tags: ['analytics-editors-leaderboard'], revalidate: 600 }
);

const getReviewersLeaderboardCached = unstable_cache(
  async (repo: string | null, from: string | null, to: string | null, limit: number) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      actor: string;
      total_reviews: bigint;
      prs_touched: bigint;
      median_response_days: number | null;
      latest_occurred_at: Date | null;
    }>>(
      `
      WITH reviewer_map AS (
        SELECT canonical, actor_lc
        FROM UNNEST($5::text[], $6::text[]) AS x(canonical, actor_lc)
      ),
      reviewer_activity AS (
        SELECT rm.canonical AS actor, ca.pr_number, ca.repository_id, ca.occurred_at
        FROM contributor_activity ca
        JOIN reviewer_map rm ON LOWER(ca.actor) = rm.actor_lc
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND ($2::text IS NULL OR ca.occurred_at >= $2::timestamp)
          AND ($3::text IS NULL OR ca.occurred_at <= $3::timestamp)
          AND ca.pr_number > 0
      ),
      by_actor AS (
        SELECT actor, COUNT(*)::bigint AS total_reviews, COUNT(DISTINCT pr_number)::bigint AS prs_touched, MAX(occurred_at) AS latest_occurred_at
        FROM reviewer_activity GROUP BY actor
      ),
      first_review AS (
        SELECT ra.actor, ra.pr_number, ra.repository_id, MIN(ra.occurred_at) AS first_at
        FROM reviewer_activity ra GROUP BY ra.actor, ra.pr_number, ra.repository_id
      ),
      response_days AS (
        SELECT fr.actor, EXTRACT(DAY FROM (fr.first_at - pr.created_at))::int AS days
        FROM first_review fr
        JOIN pull_requests pr ON pr.pr_number = fr.pr_number AND pr.repository_id = fr.repository_id
      ),
      medians AS (
        SELECT actor, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days)::numeric AS median_response_days
        FROM response_days GROUP BY actor
      )
      SELECT
        rm.canonical AS actor,
        COALESCE(ba.total_reviews, 0::bigint) AS total_reviews,
        COALESCE(ba.prs_touched, 0::bigint) AS prs_touched,
        ba.latest_occurred_at,
        m.median_response_days
      FROM reviewer_map rm
      LEFT JOIN by_actor ba ON ba.actor = rm.canonical
      LEFT JOIN medians m ON m.actor = rm.canonical
      ORDER BY COALESCE(ba.total_reviews, 0::bigint) DESC, COALESCE(ba.prs_touched, 0::bigint) DESC, rm.canonical ASC
      LIMIT $4
    `,
      repo, from, to, limit, Array.from(CANONICAL_EIP_REVIEWERS), CANONICAL_EIP_REVIEWER_LOWER
    );
    return results.map((r) => ({
      actor: r.actor,
      totalReviews: Number(r.total_reviews),
      prsTouched: Number(r.prs_touched),
      medianResponseDays: r.median_response_days != null ? Math.round(Number(r.median_response_days)) : null,
      updatedAt: r.latest_occurred_at?.toISOString() ?? null,
    }));
  },
  ['analytics-getReviewersLeaderboard'],
  { tags: ['analytics-reviewers-leaderboard'], revalidate: 600 }
);

const getEditorsByCategoryCached = unstable_cache(
  async (repo: string | null, from: string | null, to: string | null) => {
    // Try activity-based derivation first (requires populated pull_request_eips)
    const results = await prisma.$queryRawUnsafe<Array<{
      category: string;
      actor: string;
      review_count: bigint;
    }>>(
      `
      WITH editor_map AS (
        SELECT canonical, actor_lc
        FROM UNNEST($4::text[], $5::text[]) AS x(canonical, actor_lc)
      ),
      pr_eip AS (
        SELECT pr.id AS pr_id, pr.pr_number, pr.repository_id, pre.eip_number
        FROM pull_requests pr
        JOIN pull_request_eips pre ON pre.pr_number = pr.pr_number AND pre.repository_id = pr.repository_id
      ),
      review_with_category AS (
        SELECT em.canonical AS actor, COALESCE(LOWER(TRIM(es.category)), 'unknown') AS category
        FROM pr_events pe
        JOIN editor_map em ON LOWER(pe.actor) = em.actor_lc
        JOIN pr_eip prpe ON prpe.pr_number = pe.pr_number AND prpe.repository_id = pe.repository_id
        JOIN eips e ON e.eip_number = prpe.eip_number
        JOIN eip_snapshots es ON es.eip_id = e.id
        LEFT JOIN repositories r ON r.id = pe.repository_id
        WHERE pe.actor_role = 'EDITOR'
          AND pe.event_type NOT IN ('subscribed', 'mentioned', 'referenced')
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND ($2::text IS NULL OR pe.created_at >= $2::timestamp)
          AND ($3::text IS NULL OR pe.created_at <= $3::timestamp)
      ),
      ranked AS (
        SELECT category, actor, COUNT(*)::bigint AS review_count,
          ROW_NUMBER() OVER (PARTITION BY category ORDER BY COUNT(*) DESC) AS rn
        FROM review_with_category
        GROUP BY category, actor
      )
      SELECT category, actor, review_count FROM ranked WHERE rn <= 20 ORDER BY category, rn
    `,
      repo,
      from,
      to,
      Array.from(CANONICAL_EIP_EDITORS),
      CANONICAL_EIP_EDITOR_LOWER
    );

    const byCategory: Record<string, string[]> = {};
    for (const r of results) {
      const cat = r.category === 'unknown' ? 'informational' : r.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(r.actor);
    }

    // If activity data is empty (pull_request_eips not populated yet),
    // fall back to the official governance-defined editor assignments.
    const hasActivityData = Object.values(byCategory).some((arr) => arr.length > 0);
    const hasDateFilter = Boolean(from || to);
    const source = hasActivityData
      ? byCategory
      : hasDateFilter
        ? byCategory
        : OFFICIAL_EDITORS_BY_CATEGORY;

    const order = ['governance', 'core', 'erc', 'networking', 'interface', 'meta', 'informational'];
    return order.map((category) => ({ category, actors: source[category] ?? [] }));
  },
  ['analytics-getEditorsByCategory'],
  { tags: ['analytics-editors-by-category'], revalidate: 600 }
);

const getEditorsRepoDistributionCached = unstable_cache(
  async (actor: string | null, repo: string | null, from: string | null, to: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{ actor: string; repo: string; count: bigint; pct: number }>>(
      `
      WITH editor_map AS (
        SELECT canonical, actor_lc
        FROM UNNEST($5::text[], $6::text[]) AS x(canonical, actor_lc)
      ),
      raw_events AS (
        SELECT
          em.canonical AS actor,
          COALESCE(r.name, 'Unknown') AS repo,
          CASE
            WHEN pe.created_at > COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at) + INTERVAL '30 days'
              THEN COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at)
            ELSE pe.created_at
          END AS occurred_at
        FROM pr_events pe
        JOIN editor_map em ON LOWER(pe.actor) = em.actor_lc
        LEFT JOIN pull_requests pr ON pr.pr_number = pe.pr_number AND pr.repository_id = pe.repository_id
        LEFT JOIN repositories r ON r.id = pe.repository_id
        WHERE pe.pr_number > 0
          AND pe.created_at <= NOW()
          AND pe.event_type NOT IN ('subscribed', 'mentioned', 'referenced')
      ),
      base AS (
        SELECT actor, repo
        FROM raw_events
        WHERE ($1::text IS NULL OR LOWER(actor) = LOWER($1))
          AND ($2::text IS NULL OR LOWER(SPLIT_PART(repo, '/', 2)) = LOWER($2))
          AND ($3::text IS NULL OR occurred_at >= $3::timestamp)
          AND ($4::text IS NULL OR occurred_at <= $4::timestamp)
      ),
      totals AS (SELECT actor, COUNT(*) AS total FROM base GROUP BY actor)
      SELECT b.actor, b.repo, COUNT(*)::bigint AS count,
        ROUND((100.0 * COUNT(*) / NULLIF(t.total, 0))::numeric, 1)::numeric AS pct
      FROM base b JOIN totals t ON t.actor = b.actor
      GROUP BY b.actor, b.repo, t.total
      ORDER BY b.actor, count DESC
    `,
      actor, repo, from, to, Array.from(CANONICAL_EIP_EDITORS), CANONICAL_EIP_EDITOR_LOWER
    );
    return results.map((r) => ({
      actor: r.actor,
      repo: r.repo ?? 'Unknown',
      count: Number(r.count),
      pct: Number(r.pct),
    }));
  },
  ['analytics-getEditorsRepoDistribution'],
  { tags: ['analytics-editors-repo-distribution'], revalidate: 600 }
);

const getReviewersRepoDistributionCached = unstable_cache(
  async (actor: string | null, repo: string | null, from: string | null, to: string | null) => {
    const results = await prisma.$queryRawUnsafe<Array<{ actor: string; repo: string; count: bigint; pct: number }>>(
      `
      WITH reviewer_map AS (
        SELECT canonical, actor_lc
        FROM UNNEST($5::text[], $6::text[]) AS x(canonical, actor_lc)
      ),
      base AS (
        SELECT rm.canonical AS actor, COALESCE(r.name, 'Unknown') AS repo
        FROM contributor_activity ca
        JOIN reviewer_map rm ON LOWER(ca.actor) = rm.actor_lc
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE ($1::text IS NULL OR LOWER(rm.canonical) = LOWER($1))
          AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
          AND ($3::text IS NULL OR ca.occurred_at >= $3::timestamp)
          AND ($4::text IS NULL OR ca.occurred_at <= $4::timestamp)
      ),
      totals AS (SELECT actor, COUNT(*) AS total FROM base GROUP BY actor)
      SELECT b.actor, b.repo, COUNT(*)::bigint AS count,
        ROUND((100.0 * COUNT(*) / NULLIF(t.total, 0))::numeric, 1)::numeric AS pct
      FROM base b JOIN totals t ON t.actor = b.actor
      GROUP BY b.actor, b.repo, t.total
      ORDER BY b.actor, count DESC
    `,
      actor, repo, from, to, Array.from(CANONICAL_EIP_REVIEWERS), CANONICAL_EIP_REVIEWER_LOWER
    );
    return results.map((r) => ({
      actor: r.actor,
      repo: r.repo ?? 'Unknown',
      count: Number(r.count),
      pct: Number(r.pct),
    }));
  },
  ['analytics-getReviewersRepoDistribution'],
  { tags: ['analytics-reviewers-repo-distribution'], revalidate: 600 }
);

const getRecentChangesCached = unstable_cache(
  async (repo: string | null, limit: number) => {
    const results = await prisma.$queryRawUnsafe<Array<{
      eip: string; eip_type: string; title: string; from: string; to: string;
      days: number; statusColor: string; repository: string; changed_at: Date; actor: string;
    }>>(
      `SELECT e.eip_number::text as eip,
         CASE WHEN s.category = 'ERC' THEN 'ERC' WHEN r.name LIKE '%RIPs%' THEN 'RIP' ELSE 'EIP' END as eip_type,
         e.title, se.from_status as "from", se.to_status as "to",
         EXTRACT(DAY FROM (NOW() - se.changed_at))::int as days,
         CASE WHEN se.to_status = 'Final' THEN 'emerald'
              WHEN se.to_status IN ('Review', 'Last Call') THEN 'blue' ELSE 'slate' END as "statusColor",
         r.name as repository, se.changed_at,
         COALESCE(pe_actor.actor, ca_actor.actor, 'system') AS actor
       FROM eip_status_events se
       JOIN eips e ON se.eip_id = e.id
       LEFT JOIN eip_snapshots s ON s.eip_id = e.id
       LEFT JOIN repositories r ON se.repository_id = r.id
       LEFT JOIN LATERAL (
         SELECT pe.actor
         FROM pr_events pe
         WHERE pe.repository_id = se.repository_id
           AND (se.pr_number IS NULL OR pe.pr_number = se.pr_number)
           AND pe.created_at <= se.changed_at + INTERVAL '1 day'
         ORDER BY ABS(EXTRACT(EPOCH FROM (se.changed_at - pe.created_at))) ASC
         LIMIT 1
       ) pe_actor ON true
       LEFT JOIN LATERAL (
         SELECT ca.actor
         FROM contributor_activity ca
         WHERE ca.repository_id = se.repository_id
           AND (se.pr_number IS NULL OR ca.pr_number = se.pr_number)
           AND ca.occurred_at <= se.changed_at + INTERVAL '1 day'
         ORDER BY ABS(EXTRACT(EPOCH FROM (se.changed_at - ca.occurred_at))) ASC
         LIMIT 1
       ) ca_actor ON true
       WHERE se.changed_at >= NOW() - INTERVAL '7 days'
         AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
       ORDER BY se.changed_at DESC LIMIT $2`,
      repo,
      limit
    );
    return results;
  },
  ['analytics-getRecentChanges'],
  { revalidate: 120 }
);

export const analyticsProcedures = {
  getActiveProposals: optionalAuthProcedure
    .input(repoFilterSchema)
    .handler(async ({ input }) => {
      const result = await prisma.$queryRawUnsafe<Array<{
        draft: bigint;
        review: bigint;
        last_call: bigint;
        total: bigint;
      }>>(
        `
        SELECT
          COUNT(*) FILTER (WHERE s.status = 'Draft') as draft,
          COUNT(*) FILTER (WHERE s.status = 'Review') as review,
          COUNT(*) FILTER (WHERE s.status = 'Last Call') as last_call,
          COUNT(*) as total
        FROM eip_snapshots s
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE s.status IN ('Draft', 'Review', 'Last Call')
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
      `,
        input.repo ?? null
      );

      const row = result[0] || { draft: BigInt(0), review: BigInt(0), last_call: BigInt(0), total: BigInt(0) };

      return {
        total: Number(row.total),
        draft: Number(row.draft),
        review: Number(row.review),
        lastCall: Number(row.last_call)
      };
    }),

  getActiveProposalsDetailed: optionalAuthProcedure
    .input(repoFilterSchema)
    .handler(async ({ input }) => {

      const results = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        type: string;
        title: string;
        status: string;
        category: string | null;
        repository: string;
        created_at: Date | null;
      }>>(
        `
        SELECT
          e.eip_number,
          COALESCE(s.type, 'EIP') as type,
          e.title,
          s.status,
          s.category,
          r.name as repository,
          e.created_at
        FROM eip_snapshots s
        JOIN eips e ON s.eip_id = e.id
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE s.status IN ('Draft', 'Review', 'Last Call')
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY e.eip_number ASC
      `,
        input.repo ?? null
      );

      return results;
    }),

  getLifecycleData: optionalAuthProcedure
    .input(repoFilterSchema)
    .handler(async ({ input }) => {
      return getLifecycleDataCached(input.repo ?? null);
    }),

  getLifecycleDetailed: optionalAuthProcedure
    .input(repoFilterSchema)
    .handler(async ({ input }) => {

      const results = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        type: string;
        title: string;
        status: string;
        category: string | null;
        repository: string;
        created_at: Date;
      }>>(
        `
        SELECT
          e.eip_number,
          COALESCE(s.type, 'EIP') as type,
          e.title,
          s.status,
          s.category,
          r.name as repository,
          e.created_at
        FROM eip_snapshots s
        JOIN eips e ON s.eip_id = e.id
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY e.eip_number ASC
      `,
        input.repo ?? null
      );

      return results;
    }),

  getStandardsComposition: optionalAuthProcedure
    .input(repoFilterSchema)
    .handler(async ({ input }) => {
      return getStandardsCompositionCached(input.repo ?? null);
    }),

  getStandardsCompositionDetailed: optionalAuthProcedure
    .input(repoFilterSchema)
    .handler(async ({ input }) => {

      const results = await prisma.$queryRawUnsafe<Array<{
        type: string;
        category: string;
        count: bigint;
        percentage: number;
        status: string;
        eip_number: number;
        title: string;
      }>>(
        `
        WITH filtered AS (
          SELECT s.type, s.category, s.status, e.eip_number, e.title
          FROM eip_snapshots s
          JOIN eips e ON s.eip_id = e.id
          LEFT JOIN repositories r ON s.repository_id = r.id
          WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ),
        total AS (SELECT COUNT(*)::float AS n FROM filtered)
        SELECT
          type,
          COALESCE(category, 'Core') as category,
          COUNT(*) OVER (PARTITION BY type, category) as count,
          ROUND((COUNT(*) OVER (PARTITION BY type, category) * 100.0 / (SELECT n FROM total))::numeric, 1) as percentage,
          status,
          eip_number,
          title
        FROM filtered
        ORDER BY type, category, eip_number
      `,
        input.repo ?? null
      );

      return results.map(r => ({
        type: r.type,
        category: r.category,
        count: Number(r.count),
        percentage: Number(r.percentage),
        status: r.status,
        eip_number: r.eip_number,
        title: r.title
      }));
    }),

  getRecentChanges: optionalAuthProcedure
    .input(z.object({
      limit: z.number().optional().default(5),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      return getRecentChangesCached(input.repo ?? null, input.limit);
    }),

  getDecisionVelocity: optionalAuthProcedure
    .input(repoFilterSchema)
    .handler(async ({ input }) => {

      const results = await prisma.$queryRawUnsafe<Array<{
        from_status: string;
        to_status: string;
        median_days: number | null;
        count: bigint;
      }>>(
        `
        WITH repo_filtered AS (
          SELECT se.eip_id, se.repository_id, se.from_status, se.to_status, se.changed_at
          FROM eip_status_events se
          LEFT JOIN repositories r ON se.repository_id = r.id
          WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            AND se.changed_at >= NOW() - INTERVAL '365 days'
        ),
        -- Step transitions: time from entering "from" state to this transition
        step_events AS (
          SELECT e.eip_id, e.repository_id, e.from_status, e.to_status, e.changed_at,
            (SELECT MAX(e2.changed_at) FROM repo_filtered e2
             WHERE e2.eip_id = e.eip_id AND e2.repository_id = e.repository_id
               AND e2.to_status = e.from_status AND e2.changed_at < e.changed_at
            ) AS entered_from_at
          FROM repo_filtered e
          WHERE (e.from_status, e.to_status) IN (
            ('Draft', 'Review'), ('Review', 'Last Call'), ('Last Call', 'Final'), ('Draft', 'Withdrawn')
          )
        ),
        -- Draft -> Final: time from first Draft to Final
        draft_final_events AS (
          SELECT e.eip_id, e.repository_id, e.changed_at,
            (SELECT MIN(e2.changed_at) FROM repo_filtered e2
             WHERE e2.eip_id = e.eip_id AND e2.repository_id = e.repository_id
               AND e2.to_status = 'Draft' AND e2.changed_at < e.changed_at
            ) AS first_draft_at
          FROM repo_filtered e
          WHERE e.from_status = 'Draft' AND e.to_status = 'Final'
        ),
        step_durations AS (
          SELECT from_status, to_status,
            EXTRACT(DAY FROM (changed_at - entered_from_at)) AS days
          FROM step_events
          WHERE entered_from_at IS NOT NULL AND EXTRACT(DAY FROM (changed_at - entered_from_at)) >= 0
        ),
        draft_final_durations AS (
          SELECT 'Draft'::text AS from_status, 'Final'::text AS to_status,
            EXTRACT(DAY FROM (changed_at - first_draft_at)) AS days
          FROM draft_final_events
          WHERE first_draft_at IS NOT NULL AND EXTRACT(DAY FROM (changed_at - first_draft_at)) >= 0
        ),
        all_durations AS (
          SELECT from_status, to_status, days FROM step_durations
          UNION ALL
          SELECT from_status, to_status, days FROM draft_final_durations
        )
        SELECT
          from_status,
          to_status,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days)::numeric AS median_days,
          COUNT(*)::bigint AS count
        FROM all_durations
        GROUP BY from_status, to_status
        ORDER BY
          CASE from_status WHEN 'Draft' THEN 1 WHEN 'Review' THEN 2 WHEN 'Last Call' THEN 3 ELSE 4 END,
          CASE to_status WHEN 'Review' THEN 1 WHEN 'Last Call' THEN 2 WHEN 'Final' THEN 3 WHEN 'Withdrawn' THEN 4 ELSE 5 END
      `,
        input.repo ?? null
      );

      const transitions = results.map((r) => ({
        from: r.from_status,
        to: r.to_status,
        medianDays: r.median_days != null ? Math.round(Number(r.median_days)) : null,
        count: Number(r.count),
      }));

      const draftToFinal = transitions.find((t) => t.from === 'Draft' && t.to === 'Final');
      const draftToFinalMedian = draftToFinal?.medianDays ?? 0;
      const previousYearPlaceholder = draftToFinalMedian > 0 ? draftToFinalMedian + 42 : 0;

      return {
        transitions,
        draftToFinalMedian,
        previousYearPlaceholder,
        change: previousYearPlaceholder > 0 ? Math.round((-15 * draftToFinalMedian) / previousYearPlaceholder) : 0,
      };
    }),

  getMomentumData: optionalAuthProcedure
    .input(z.object({
      months: z.number().optional().default(12),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {

      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        count: bigint;
      }>>(
        `
        SELECT
          TO_CHAR(date_trunc('month', se.changed_at), 'Mon') as month,
          COUNT(*)::bigint as count
        FROM eip_status_events se
        LEFT JOIN repositories r ON se.repository_id = r.id
        WHERE se.changed_at >= date_trunc('month', NOW() - INTERVAL '11 months')
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY date_trunc('month', se.changed_at)
        ORDER BY date_trunc('month', se.changed_at) ASC
      `,
        input.repo ?? null
      );

      return results.map(r => Number(r.count));
    }),

  getRecentPRs: optionalAuthProcedure
    .input(z.object({
      limit: z.number().optional().default(5),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {

      const results = await prisma.$queryRawUnsafe<Array<{
        number: string;
        title: string;
        author: string;
        status: string;
        days: number;
      }>>(
        `
        SELECT 
          pr.pr_number::text as number,
          pr.title,
          pr.author,
          CASE 
            WHEN pr.merged_at IS NOT NULL THEN 'merged' 
            ELSE 'open' 
          END as status,
          EXTRACT(DAY FROM (NOW() - pr.created_at))::int as days
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY pr.created_at DESC
        LIMIT $2
      `,
        input.repo ?? null,
        input.limit
      );

      return results;
    }),

  getRecentClosedMergedPRs: optionalAuthProcedure
    .input(z.object({
      limit: z.number().optional().default(25),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        number: string;
        title: string;
        status: string;
        closedAt: string;
        repoShort: string;
      }>>(
        `
        SELECT 
          pr.pr_number::text as number,
          pr.title,
          CASE 
            WHEN pr.merged_at IS NOT NULL THEN 'Merged' 
            ELSE 'Closed' 
          END as status,
          COALESCE(pr.merged_at, pr.closed_at)::text as "closedAt",
          LOWER(SPLIT_PART(r.name, '/', 2)) as "repoShort"
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE pr.state = 'closed'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY COALESCE(pr.merged_at, pr.closed_at) DESC NULLS LAST
        LIMIT $2
      `,
        input.repo ?? null,
        input.limit
      );
      return results.map((r) => ({
        number: r.number,
        title: r.title ?? '',
        status: r.status,
        closedAt: r.closedAt,
        repoShort: r.repoShort ?? 'unknown',
      }));
    }),

  getEditorReviewsLast24h: optionalAuthProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        pr_number: string;
        title: string;
        reviewer: string;
        submitted_at: string;
        repo_short: string;
      }>>(
        `
        SELECT 
          rev.pr_number::text as pr_number,
          pr.title,
          rev.reviewer,
          rev.submitted_at::text as submitted_at,
          LOWER(SPLIT_PART(r.name, '/', 2)) as repo_short
        FROM pr_reviews rev
        JOIN repositories r ON rev.repository_id = r.id
        LEFT JOIN pull_requests pr ON pr.pr_number = rev.pr_number AND pr.repository_id = rev.repository_id
        WHERE rev.submitted_at >= NOW() - INTERVAL '24 hours'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY rev.submitted_at DESC
        LIMIT $2
      `,
        input.repo ?? null,
        input.limit
      );
      return results.map((r) => ({
        prNumber: r.pr_number,
        title: r.title ?? '',
        reviewer: r.reviewer,
        submittedAt: r.submitted_at,
        repoShort: r.repo_short ?? 'unknown',
      }));
    }),

  getRecentEditorActivity: optionalAuthProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      onlyOpenPRs: z.boolean().optional().default(true),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        pr_number: string;
        title: string | null;
        editor: string;
        event_type: string;
        acted_at: string;
        repo_short: string;
        event_url: string | null;
      }>>(
        `
        SELECT
          pe.pr_number::text AS pr_number,
          pr.title,
          pe.actor AS editor,
          pe.event_type,
          pe.created_at::text AS acted_at,
          LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short,
          COALESCE(
            pe.metadata->>'html_url',
            CASE
              WHEN pe.event_type IN ('commented', 'issue_comment') AND pe.metadata->>'comment_id' IS NOT NULL
                THEN 'https://github.com/' || r.name || '/pull/' || pe.pr_number::text || '#issuecomment-' || (pe.metadata->>'comment_id')
              WHEN pe.event_type = 'review_comment' AND pe.metadata->>'comment_id' IS NOT NULL
                THEN 'https://github.com/' || r.name || '/pull/' || pe.pr_number::text || '#discussion_r' || (pe.metadata->>'comment_id')
              WHEN pe.event_type = 'reviewed' AND pe.metadata->>'review_id' IS NOT NULL
                THEN 'https://github.com/' || r.name || '/pull/' || pe.pr_number::text || '#pullrequestreview-' || (pe.metadata->>'review_id')
              ELSE 'https://github.com/' || r.name || '/pull/' || pe.pr_number::text
            END
          ) AS event_url
        FROM pr_events pe
        JOIN repositories r ON pe.repository_id = r.id
        LEFT JOIN pull_requests pr
          ON pr.pr_number = pe.pr_number
         AND pr.repository_id = pe.repository_id
        WHERE pe.actor_role = 'EDITOR'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND ($2::boolean = FALSE OR pr.state = 'open')
        ORDER BY pe.created_at DESC
        LIMIT $3
      `,
        input.repo ?? null,
        input.onlyOpenPRs ?? true,
        input.limit
      );

      return results.map((r) => ({
        prNumber: r.pr_number,
        title: r.title ?? '',
        editor: r.editor,
        eventType: r.event_type,
        actedAt: r.acted_at,
        repoShort: r.repo_short ?? 'unknown',
        eventUrl: r.event_url ?? null,
      }));
    }),

  getReviewActivityTotal: optionalAuthProcedure
    .input(z.object({
      hours: z.number().optional().default(24),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `
        SELECT COUNT(*)::bigint as total
        FROM pr_reviews rev
        JOIN repositories r ON rev.repository_id = r.id
        WHERE rev.submitted_at >= NOW() - INTERVAL '1 hour' * $1
          AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
      `,
        input.hours,
        input.repo ?? null
      );
      return { total: Number(results[0]?.total ?? 0) };
    }),

  getLastCallWatchlist: optionalAuthProcedure
    .input(repoFilterSchema)
    .handler(async ({ input }) => {

      const results = await prisma.$queryRawUnsafe<Array<{
        eip: string;
        eip_type: string;
        title: string;
        deadline: string;
        daysRemaining: number;
        category: string | null;
        repository: string;
      }>>(
        `
        SELECT 
          e.eip_number::text as eip,
          CASE 
            WHEN s.category = 'ERC' THEN 'ERC'
            WHEN r.name LIKE '%RIPs%' THEN 'RIP'
            ELSE 'EIP'
          END as eip_type,
          e.title,
          s.deadline::text as deadline,
          EXTRACT(DAY FROM (s.deadline - NOW()))::int as "daysRemaining",
          s.category,
          r.name as repository
        FROM eip_snapshots s
        JOIN eips e ON s.eip_id = e.id
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE s.status = 'Last Call'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY s.deadline ASC
      `,
        input.repo ?? null
      );

      return results;
    }),

  // PR Analytics Procedures
  getPRMonthlyActivity: optionalAuthProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {

      return getPRMonthlyActivityCached(
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null
      );
    }),

  getPROpenState: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      try {
        return await getPROpenStateCached(input.repo ?? null);
      } catch (error) {
        if (isConnectionSaturationError(error)) {
          console.warn("analytics.getPROpenState: returning fallback due to DB connection saturation");
          return {
            totalOpen: 0,
            medianAge: 0,
            oldestPR: null,
          };
        }
        throw error;
      }
    }),

  getPRGovernanceStates: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      return getPRGovernanceStatesCached(input.repo ?? null);
    }),

  getPRLabels: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {

      const results = await prisma.$queryRawUnsafe<Array<{
        label: string;
        count: bigint;
      }>>(`
        WITH pr_metadata AS (
          SELECT 
            pr.pr_number,
            pr.repository_id,
            CASE 
              WHEN pr.merged_at IS NOT NULL THEN 'merged'
              WHEN pr.state = 'open' THEN 'open'
              ELSE 'closed'
            END as state
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.state = 'open'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ),
        current_labels AS (
          SELECT DISTINCT ON (e.pr_number, e.repository_id, e.metadata->>'label')
            e.pr_number,
            e.repository_id,
            e.metadata->>'label' as label
          FROM pr_events e
          WHERE e.event_type IN ('labeled', 'unlabeled')
          ORDER BY e.pr_number, e.repository_id, e.metadata->>'label', 
                   CASE WHEN e.event_type = 'labeled' THEN 1 ELSE 0 END DESC,
                   e.created_at DESC
        )
        SELECT 
          cl.label,
          COUNT(DISTINCT cl.pr_number)::bigint as count
        FROM current_labels cl
        JOIN pr_metadata pm ON cl.pr_number = pm.pr_number AND cl.repository_id = pm.repository_id
        WHERE cl.label IS NOT NULL
        GROUP BY cl.label
        ORDER BY count DESC
      `, input.repo || null);

      return results.map(r => ({
        label: r.label,
        count: Number(r.count),
      }));
    }),

  getPRLifecycleFunnel: optionalAuthProcedure
    .input(z.object({}))
    .handler(async () => {

      const results = await prisma.$queryRawUnsafe<Array<{
        stage: string;
        count: bigint;
        percentage: number;
      }>>(`
        WITH pr_stages AS (
          SELECT 
            pr.pr_number,
            CASE 
              WHEN pr.merged_at IS NOT NULL THEN 'merged'
              WHEN pr.closed_at IS NOT NULL THEN 'closed'
              WHEN EXISTS (
                SELECT 1 FROM contributor_activity ca 
                WHERE ca.pr_number = pr.pr_number 
                  AND ca.repository_id = pr.repository_id
                  AND ca.action_type = 'reviewed'
              ) THEN 'reviewed'
              ELSE 'created'
            END as stage
          FROM pull_requests pr
        )
        SELECT 
          stage,
          COUNT(*)::bigint as count,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pull_requests))::numeric, 1)::numeric as percentage
        FROM pr_stages
        GROUP BY stage
        ORDER BY 
          CASE stage
            WHEN 'created' THEN 1
            WHEN 'reviewed' THEN 2
            WHEN 'merged' THEN 3
            WHEN 'closed' THEN 4
          END
      `);

      return results.map(r => ({
        stage: r.stage,
        count: Number(r.count),
        percentage: Number(r.percentage),
      }));
    }),

  getPRTimeToOutcome: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      return getPRTimeToOutcomeCached(input.repo ?? null);
    }),

  getPRStaleness: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      return getPRStalenessCached(input.repo ?? null);
    }),

  getPRStaleHighRisk: optionalAuthProcedure
    .input(z.object({
      days: z.number().optional().default(30),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {

      const results = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        repo: string;
        title: string;
        author: string;
        age_days: number;
        last_activity: string;
      }>>(`
        open_prs AS (
          SELECT 
            pr.pr_number,
            r.name as repo,
            pr.title,
            pr.author,
            EXTRACT(DAY FROM (NOW() - pr.created_at))::int as age_days,
            GREATEST(
              (SELECT MAX(created_at) FROM pr_events e 
               WHERE e.pr_number = pr.pr_number 
                 AND e.repository_id = pr.repository_id),
              (SELECT MAX(occurred_at) FROM contributor_activity ca 
               WHERE ca.pr_number = pr.pr_number 
                 AND ca.repository_id = pr.repository_id)
            ) as last_activity
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.state = 'open'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            AND EXISTS (
              SELECT 1 FROM pr_governance_state gs
              WHERE gs.pr_number = pr.pr_number
                AND gs.repository_id = pr.repository_id
            )
        )
        SELECT 
          pr_number,
          repo,
          title,
          author,
          age_days,
          COALESCE(TO_CHAR(last_activity, 'YYYY-MM-DD'), 'Never') as last_activity
        FROM open_prs
        WHERE last_activity IS NULL 
           OR EXTRACT(DAY FROM (NOW() - last_activity)) >= $2
        ORDER BY age_days DESC
        LIMIT 20
      `, input.repo || null, input.days);

      return results.map(r => ({
        prNumber: r.pr_number,
        repo: r.repo,
        title: r.title,
        author: r.author,
        ageDays: r.age_days,
        lastActivity: r.last_activity,
      }));
    }),

  // Month-scoped hero KPIs (end-of-period snapshot)
  getPRMonthHeroKPIs: optionalAuthProcedure
    .input(z.object({
      year: z.number(),
      month: z.number(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const monthStr = `${input.year}-${String(input.month).padStart(2, '0')}`;
      try {
        return await getPRMonthHeroKPIsCached(input.repo ?? null, monthStr);
      } catch (error) {
        if (isConnectionSaturationError(error)) {
          console.warn("analytics.getPRMonthHeroKPIs: returning fallback due to DB connection saturation");
          return {
            month: monthStr,
            openPRs: 0,
            newPRs: 0,
            mergedPRs: 0,
            closedUnmerged: 0,
            netDelta: 0,
          };
        }
        throw error;
      }
    }),

  // Open PR classification (DRAFT, TYPO, NEW_EIP, STATUS_CHANGE, OTHER) — one bucket per PR
  getPROpenClassification: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }))
    .handler(async ({ input }) => {

      const results = await prisma.$queryRawUnsafe<Array<{
        category: string;
        count: bigint;
      }>>(`
        WITH month_ctx AS (
          SELECT
            $2::text AS month_key,
            ($2::text || '-01')::date AS month_start,
            (($2::text || '-01')::date + INTERVAL '1 month' - INTERVAL '1 day')::timestamp AS month_end
        ),
        snapshot_ctx AS (
          SELECT
            CASE
              WHEN $2::text IS NULL THEN NOW()::timestamp
              WHEN (SELECT month_key FROM month_ctx) = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN NOW()::timestamp
              ELSE (SELECT month_end FROM month_ctx)
            END AS snapshot_ts
        ),
        open_prs AS (
          SELECT pr.id AS pr_id, pr.pr_number, pr.repository_id, pr.title, pr.labels, gs.category
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          LEFT JOIN pr_governance_state gs ON pr.pr_number = gs.pr_number AND pr.repository_id = gs.repository_id
          CROSS JOIN snapshot_ctx sc
          WHERE pr.created_at <= sc.snapshot_ts
            AND (pr.merged_at IS NULL OR pr.merged_at > sc.snapshot_ts)
            AND (pr.closed_at IS NULL OR pr.closed_at > sc.snapshot_ts)
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ),
        classified AS (
          SELECT op.pr_id,
            COALESCE(op.category, CASE
              WHEN LOWER(COALESCE(op.title, '')) LIKE '%typo%' OR LOWER(COALESCE(op.title, '')) LIKE '%fix typo%'
                OR LOWER(COALESCE(op.title, '')) LIKE '%editorial%' OR LOWER(COALESCE(op.title, '')) LIKE '%grammar%' THEN 'Typo'
              WHEN COALESCE(op.labels, ARRAY[]::text[]) && ARRAY['c-status', 'c-update']::text[] THEN 'Status Change'
              WHEN EXISTS (
                SELECT 1 FROM pull_request_eips pre
                JOIN eips e ON e.eip_number = pre.eip_number
                JOIN eip_snapshots s ON s.eip_id = e.id
                WHERE pre.pr_number = op.pr_number AND pre.repository_id = op.repository_id AND s.status = 'Draft'
              ) THEN 'New EIP'
              WHEN LOWER(COALESCE(op.title, '')) LIKE '%status%' OR LOWER(COALESCE(op.title, '')) LIKE '%draft%'
                OR LOWER(COALESCE(op.title, '')) LIKE '%review%' OR LOWER(COALESCE(op.title, '')) LIKE '%last call%'
                OR LOWER(COALESCE(op.title, '')) LIKE '%final%' OR LOWER(COALESCE(op.title, '')) LIKE '%withdrawn%'
                OR LOWER(COALESCE(op.title, '')) LIKE '%stagnant%' OR LOWER(COALESCE(op.title, '')) LIKE '%living%'
                OR LOWER(COALESCE(op.title, '')) LIKE '%wip%' THEN 'PR DRAFT'
              ELSE 'Content Edit'
            END) AS category
          FROM open_prs op
        )
        SELECT category, COUNT(*)::bigint AS count
        FROM classified
        GROUP BY category
        ORDER BY count DESC
      `, input.repo || null, input.month ?? null);

      const order = ['PR DRAFT', 'Typo', 'New EIP', 'Status Change', 'Website', 'Tooling', 'EIP-1', 'Content Edit'];
      const byCat = Object.fromEntries(results.map(r => [r.category, Number(r.count)]));
      return order.map(category => ({ category, count: byCat[category] ?? 0 }));
    }),

  // Governance waiting state with median wait and oldest PR per bucket
  getPRGovernanceWaitingState: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }))
    .handler(async ({ input }) => {

      const results = await prisma.$queryRawUnsafe<Array<{
        state: string;
        label: string;
        count: bigint;
        median_wait_days: number | null;
        oldest_pr_number: number | null;
        oldest_wait_days: number | null;
      }>>(`
        WITH month_ctx AS (
          SELECT
            $2::text AS month_key,
            ($2::text || '-01')::date AS month_start,
            (($2::text || '-01')::date + INTERVAL '1 month' - INTERVAL '1 day')::timestamp AS month_end
        ),
        snapshot_ctx AS (
          SELECT
            CASE
              WHEN $2::text IS NULL THEN NOW()::timestamp
              WHEN (SELECT month_key FROM month_ctx) = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN NOW()::timestamp
              ELSE (SELECT month_end FROM month_ctx)
            END AS snapshot_ts
        ),
        open_with_state AS (
          SELECT pr.pr_number, pr.repository_id, r.name AS repo_name,
                 CASE
                   WHEN COALESCE(gs.current_state, 'NO_STATE') IN ('WAITING_ON_EDITOR', 'WAITING_EDITOR') THEN 'Waiting on Editor'
                   WHEN COALESCE(gs.current_state, 'NO_STATE') IN ('WAITING_ON_AUTHOR', 'WAITING_AUTHOR') THEN 'Waiting on Author'
                   WHEN COALESCE(gs.current_state, 'NO_STATE') = 'DRAFT' THEN 'AWAITED'
                 END AS state,
                 gs.waiting_since,
                 sc.snapshot_ts
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          LEFT JOIN pr_governance_state gs ON pr.pr_number = gs.pr_number AND pr.repository_id = gs.repository_id
          CROSS JOIN snapshot_ctx sc
          WHERE pr.created_at <= sc.snapshot_ts
            AND (pr.merged_at IS NULL OR pr.merged_at > sc.snapshot_ts)
            AND (pr.closed_at IS NULL OR pr.closed_at > sc.snapshot_ts)
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            AND COALESCE(gs.current_state, 'NO_STATE') IN ('WAITING_ON_EDITOR', 'WAITING_EDITOR', 'WAITING_ON_AUTHOR', 'WAITING_AUTHOR', 'DRAFT', 'NO_STATE')
        ),
        wait_days AS (
          SELECT state, pr_number,
                 GREATEST(
                   0,
                   EXTRACT(DAY FROM (snapshot_ts - COALESCE(waiting_since, snapshot_ts)))
                 )::int AS wait_days
          FROM open_with_state
          WHERE state IS NOT NULL
        ),
        by_state AS (
          SELECT state,
                 COUNT(*)::bigint AS count,
                 PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY wait_days)::numeric AS median_wait_days,
                 MIN(wait_days) AS min_days
          FROM wait_days GROUP BY state
        ),
        oldest_per_state AS (
          SELECT DISTINCT ON (wd.state) wd.state, wd.pr_number AS oldest_pr_number, wd.wait_days AS oldest_wait_days
          FROM wait_days wd
          ORDER BY wd.state, wd.wait_days DESC
        )
        SELECT bs.state,
               bs.state AS label,
               bs.count,
               bs.median_wait_days::numeric,
               op.oldest_pr_number,
               op.oldest_wait_days::numeric
        FROM by_state bs
        LEFT JOIN oldest_per_state op ON op.state = bs.state
        ORDER BY bs.count DESC
      `, input.repo || null, input.month ?? null);

      return results.map(r => ({
        state: r.state,
        label: r.label,
        count: Number(r.count),
        medianWaitDays: r.median_wait_days != null ? Math.round(Number(r.median_wait_days)) : null,
        oldestPRNumber: r.oldest_pr_number ?? null,
        oldestWaitDays: r.oldest_wait_days != null ? Math.round(Number(r.oldest_wait_days)) : null,
      }));
    }),

  // Export: open PRs with governance state (for CSV/JSON download)
  getPROpenExport: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }))
    .handler(async ({ input }) => {

      const rows = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        repo: string;
        title: string | null;
        author: string | null;
        created_at: string;
        state: string;
        waiting_since: string | null;
        last_event_type: string | null;
        linked_eips: string | null;
      }>>(`
        WITH month_ctx AS (
          SELECT
            $2::text AS month_key,
            ($2::text || '-01')::date AS month_start,
            (($2::text || '-01')::date + INTERVAL '1 month' - INTERVAL '1 day')::timestamp AS month_end
        ),
        snapshot_ctx AS (
          SELECT
            CASE
              WHEN $2::text IS NULL THEN NOW()::timestamp
              WHEN (SELECT month_key FROM month_ctx) = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN NOW()::timestamp
              ELSE (SELECT month_end FROM month_ctx)
            END AS snapshot_ts
        )
        SELECT pr.pr_number, r.name AS repo, pr.title, pr.author,
               TO_CHAR(pr.created_at, 'YYYY-MM-DD') AS created_at,
               CASE
                 WHEN COALESCE(gs.current_state, 'NO_STATE') IN ('WAITING_ON_EDITOR', 'WAITING_EDITOR') THEN 'Waiting on Editor'
                 WHEN COALESCE(gs.current_state, 'NO_STATE') IN ('WAITING_ON_AUTHOR', 'WAITING_AUTHOR') THEN 'Waiting on Author'
                 WHEN COALESCE(gs.current_state, 'NO_STATE') = 'DRAFT' THEN 'AWAITED'
                 ELSE COALESCE(gs.subcategory, 'Uncategorized')
               END AS state,
               TO_CHAR(gs.waiting_since, 'YYYY-MM-DD') AS waiting_since,
               COALESCE(gs.reason, gs.last_event_type) AS last_event_type,
               (SELECT STRING_AGG(pre.eip_number::text, ',') FROM pull_request_eips pre WHERE pre.pr_number = pr.pr_number AND pre.repository_id = pr.repository_id) AS linked_eips
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        LEFT JOIN pr_governance_state gs ON pr.pr_number = gs.pr_number AND pr.repository_id = gs.repository_id
        CROSS JOIN snapshot_ctx sc
        WHERE pr.created_at <= sc.snapshot_ts
          AND (pr.merged_at IS NULL OR pr.merged_at > sc.snapshot_ts)
          AND (pr.closed_at IS NULL OR pr.closed_at > sc.snapshot_ts)
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY pr.created_at ASC
        LIMIT 5000
      `, input.repo || null, input.month ?? null);

      return rows.map(r => ({
        prNumber: r.pr_number,
        repo: r.repo,
        title: r.title,
        author: r.author,
        createdAt: r.created_at,
        governanceState: r.state,
        waitingSince: r.waiting_since,
        lastEventType: r.last_event_type,
        linkedEIPs: r.linked_eips ?? null,
      }));
    }),

  exportPRAnalyticsDetailedCSV: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      fromMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      toMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      contextMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }))
    .handler(async ({ input }) => {
      const fromMonth = input.fromMonth ?? null;
      const toMonth = input.toMonth ?? null;
      const contextMonth = input.contextMonth ?? null;

      const monthly = await getPRMonthlyActivityCached(input.repo ?? null, fromMonth, toMonth);

      const detailRows = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        repo: string;
        title: string | null;
        author: string | null;
        state: string | null;
        created_at: Date | null;
        merged_at: Date | null;
        closed_at: Date | null;
        governance_state: string | null;
        waiting_since: Date | null;
        linked_eips: string | null;
        created_in_window: boolean;
        merged_in_window: boolean;
        closed_unmerged_in_window: boolean;
        open_in_context_month: boolean;
      }>>(
        `
        WITH bounds AS (
          SELECT
            CASE WHEN $2::text IS NULL THEN NULL ELSE TO_DATE($2 || '-01', 'YYYY-MM-DD')::timestamp END AS from_ts,
            CASE WHEN $3::text IS NULL THEN NULL ELSE (TO_DATE($3 || '-01', 'YYYY-MM-DD') + INTERVAL '1 month')::timestamp END AS to_exclusive_ts
        ),
        context AS (
          SELECT
            CASE
              WHEN $4::text IS NULL THEN NULL
              WHEN $4::text = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN NOW()::timestamp
              ELSE (TO_DATE($4 || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' - INTERVAL '1 second')::timestamp
            END AS snapshot_ts
        )
        SELECT
          pr.pr_number,
          r.name AS repo,
          pr.title,
          pr.author,
          pr.state,
          pr.created_at,
          pr.merged_at,
          pr.closed_at,
          CASE
            WHEN COALESCE(gs.current_state, 'NO_STATE') IN ('WAITING_ON_EDITOR', 'WAITING_EDITOR') THEN 'Waiting on Editor'
            WHEN COALESCE(gs.current_state, 'NO_STATE') IN ('WAITING_ON_AUTHOR', 'WAITING_AUTHOR') THEN 'Waiting on Author'
            WHEN COALESCE(gs.current_state, 'NO_STATE') = 'DRAFT' THEN 'AWAITED'
            ELSE COALESCE(gs.subcategory, 'Uncategorized')
          END AS governance_state,
          gs.waiting_since,
          (SELECT STRING_AGG(pre.eip_number::text, '|')
           FROM pull_request_eips pre
           WHERE pre.pr_number = pr.pr_number
             AND pre.repository_id = pr.repository_id) AS linked_eips,
          (
            (SELECT from_ts FROM bounds) IS NULL
            OR (
              pr.created_at >= (SELECT from_ts FROM bounds)
              AND ((SELECT to_exclusive_ts FROM bounds) IS NULL OR pr.created_at < (SELECT to_exclusive_ts FROM bounds))
            )
          ) AS created_in_window,
          (
            pr.merged_at IS NOT NULL
            AND ((SELECT from_ts FROM bounds) IS NULL OR pr.merged_at >= (SELECT from_ts FROM bounds))
            AND ((SELECT to_exclusive_ts FROM bounds) IS NULL OR pr.merged_at < (SELECT to_exclusive_ts FROM bounds))
          ) AS merged_in_window,
          (
            pr.closed_at IS NOT NULL
            AND pr.merged_at IS NULL
            AND ((SELECT from_ts FROM bounds) IS NULL OR pr.closed_at >= (SELECT from_ts FROM bounds))
            AND ((SELECT to_exclusive_ts FROM bounds) IS NULL OR pr.closed_at < (SELECT to_exclusive_ts FROM bounds))
          ) AS closed_unmerged_in_window,
          (
            (SELECT snapshot_ts FROM context) IS NOT NULL
            AND pr.created_at <= (SELECT snapshot_ts FROM context)
            AND (pr.merged_at IS NULL OR pr.merged_at > (SELECT snapshot_ts FROM context))
            AND (pr.closed_at IS NULL OR pr.closed_at > (SELECT snapshot_ts FROM context))
          ) AS open_in_context_month
        FROM pull_requests pr
        JOIN repositories r ON r.id = pr.repository_id
        LEFT JOIN pr_governance_state gs
          ON gs.pr_number = pr.pr_number
         AND gs.repository_id = pr.repository_id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND (
            ((SELECT from_ts FROM bounds) IS NULL AND (SELECT to_exclusive_ts FROM bounds) IS NULL)
            OR (
              pr.created_at >= COALESCE((SELECT from_ts FROM bounds), pr.created_at)
              AND pr.created_at < COALESCE((SELECT to_exclusive_ts FROM bounds), pr.created_at + INTERVAL '1 second')
            )
            OR (
              pr.merged_at IS NOT NULL
              AND pr.merged_at >= COALESCE((SELECT from_ts FROM bounds), pr.merged_at)
              AND pr.merged_at < COALESCE((SELECT to_exclusive_ts FROM bounds), pr.merged_at + INTERVAL '1 second')
            )
            OR (
              pr.closed_at IS NOT NULL
              AND pr.closed_at >= COALESCE((SELECT from_ts FROM bounds), pr.closed_at)
              AND pr.closed_at < COALESCE((SELECT to_exclusive_ts FROM bounds), pr.closed_at + INTERVAL '1 second')
            )
          )
        ORDER BY COALESCE(pr.closed_at, pr.merged_at, pr.created_at) DESC, pr.pr_number DESC
        LIMIT 10000
        `,
        input.repo ?? null,
        fromMonth,
        toMonth,
        contextMonth
      );

      const escapeCsv = (value: string | number | null | undefined | boolean) =>
        `"${String(value ?? '').replace(/"/g, '""')}"`;

      const summaryHeader = [
        'record_type',
        'repo_filter',
        'from_month',
        'to_month',
        'context_month',
        'month',
        'created',
        'merged',
        'closed_unmerged',
        'open_at_month_end',
        'metric_definition',
      ].join(',');
      const summaryBody = monthly.map((row) =>
        [
          'summary',
          escapeCsv(input.repo ?? 'all'),
          escapeCsv(fromMonth ?? ''),
          escapeCsv(toMonth ?? ''),
          escapeCsv(contextMonth ?? ''),
          escapeCsv(row.month),
          row.created,
          row.merged,
          row.closed,
          row.openAtMonthEnd,
          escapeCsv('Monthly PR activity counts used in the open PR trend chart'),
        ].join(',')
      );

      const detailHeader = [
        'record_type',
        'repo_filter',
        'from_month',
        'to_month',
        'context_month',
        'pr_number',
        'repo',
        'title',
        'author',
        'state',
        'created_at_utc',
        'merged_at_utc',
        'closed_at_utc',
        'governance_state',
        'waiting_since_utc',
        'linked_eips',
        'created_in_window',
        'merged_in_window',
        'closed_unmerged_in_window',
        'open_in_context_month',
        'metric_definition',
      ].join(',');
      const detailBody = detailRows.map((row) =>
        [
          'detail',
          escapeCsv(input.repo ?? 'all'),
          escapeCsv(fromMonth ?? ''),
          escapeCsv(toMonth ?? ''),
          escapeCsv(contextMonth ?? ''),
          row.pr_number,
          escapeCsv(row.repo),
          escapeCsv(row.title),
          escapeCsv(row.author),
          escapeCsv(row.state),
          escapeCsv(row.created_at?.toISOString() ?? ''),
          escapeCsv(row.merged_at?.toISOString() ?? ''),
          escapeCsv(row.closed_at?.toISOString() ?? ''),
          escapeCsv(row.governance_state),
          escapeCsv(row.waiting_since?.toISOString() ?? ''),
          escapeCsv(row.linked_eips),
          escapeCsv(row.created_in_window),
          escapeCsv(row.merged_in_window),
          escapeCsv(row.closed_unmerged_in_window),
          escapeCsv(row.open_in_context_month),
          escapeCsv('PR-level metadata row aligned to selected report window'),
        ].join(',')
      );

      const stamp = new Date().toISOString().slice(0, 10);
      return {
        csv: [summaryHeader, ...summaryBody, '', detailHeader, ...detailBody].join('\n'),
        filename: `pr-analytics-detailed-${input.repo ?? 'all'}-${fromMonth ?? 'all'}-${toMonth ?? 'all'}-${stamp}.csv`,
      };
    }),

  // PR detail page payload (legacy parity route support)
  getPRDetail: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']),
      number: z.number().int().positive(),
    }))
    .handler(async ({ input }) => {
      const prRows = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        repository_id: number;
        repo_name: string;
        repo_short: string;
        title: string | null;
        author: string | null;
        state: string | null;
        created_at: Date | null;
        updated_at: Date | null;
        merged_at: Date | null;
        closed_at: Date | null;
        num_commits: number | null;
        num_files: number | null;
        num_comments: number | null;
        num_reviews: number | null;
        labels: string[] | null;
        body: string | null;
        governance_state: string | null;
        waiting_since: Date | null;
        last_actor: string | null;
        last_event_type: string | null;
      }>>(
        `
        SELECT
          pr.pr_number,
          pr.repository_id,
          r.name AS repo_name,
          LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short,
          pr.title,
          pr.author,
          pr.state,
          pr.created_at,
          pr.updated_at,
          pr.merged_at,
          pr.closed_at,
          pr.num_commits,
          pr.num_files,
          pr.num_comments,
          pr.num_reviews,
          pr.labels,
          pr.body,
          gs.current_state AS governance_state,
          gs.waiting_since,
          gs.last_actor,
          gs.last_event_type
        FROM pull_requests pr
        JOIN repositories r ON r.id = pr.repository_id
        LEFT JOIN pr_governance_state gs
          ON gs.pr_number = pr.pr_number
         AND gs.repository_id = pr.repository_id
        WHERE pr.pr_number = $1
          AND LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2)
        LIMIT 1
        `,
        input.number,
        input.repo
      );

      const pr = prRows[0];
      if (!pr) return null;

      const reviews = await prisma.$queryRawUnsafe<Array<{
        id: bigint;
        reviewer: string;
        review_state: string;
        submitted_at: Date;
        github_id: string | null;
      }>>(
        `
        SELECT id, reviewer, review_state, submitted_at, github_id
        FROM pr_reviews
        WHERE pr_number = $1
          AND repository_id = $2
        ORDER BY submitted_at DESC
        `,
        pr.pr_number,
        pr.repository_id
      );

      const events = await prisma.$queryRawUnsafe<Array<{
        id: bigint;
        event_type: string;
        actor: string;
        actor_role: string | null;
        commit_sha: string | null;
        created_at: Date;
        body: string | null;
        label: string | null;
        review_state: string | null;
        comment_id: string | null;
        review_id: string | null;
        html_url: string | null;
        check_name: string | null;
        check_status: string | null;
        check_conclusion: string | null;
        details_url: string | null;
        unresolved: boolean | null;
      }>>(
        `
        SELECT
          e.id,
          e.event_type,
          e.actor,
          e.actor_role,
          e.commit_sha,
          e.created_at,
          e.metadata->>'body' AS body,
          e.metadata->>'label' AS label,
          e.metadata->>'review_state' AS review_state,
          e.metadata->>'comment_id' AS comment_id,
          e.metadata->>'review_id' AS review_id,
          e.metadata->>'html_url' AS html_url,
          COALESCE(e.metadata->>'check_name', e.metadata->>'name') AS check_name,
          e.metadata->>'status' AS check_status,
          e.metadata->>'conclusion' AS check_conclusion,
          COALESCE(e.metadata->>'details_url', e.metadata->>'target_url') AS details_url,
          CASE
            WHEN LOWER(COALESCE(e.metadata->>'unresolved', '')) IN ('true', 'false')
              THEN (e.metadata->>'unresolved')::boolean
            WHEN LOWER(COALESCE(e.metadata->>'is_resolved', '')) IN ('true', 'false')
              THEN NOT (e.metadata->>'is_resolved')::boolean
            WHEN LOWER(COALESCE(e.metadata->>'resolved', '')) IN ('true', 'false')
              THEN NOT (e.metadata->>'resolved')::boolean
            ELSE NULL
          END AS unresolved
        FROM pr_events e
        WHERE e.pr_number = $1
          AND e.repository_id = $2
        ORDER BY e.created_at DESC
        `,
        pr.pr_number,
        pr.repository_id
      );

      const related = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        title: string | null;
        status: string | null;
        category: string | null;
        repo_short: string | null;
      }>>(
        `
        SELECT
          pre.eip_number,
          e.title,
          s.status,
          s.category,
          LOWER(SPLIT_PART(r2.name, '/', 2)) AS repo_short
        FROM pull_request_eips pre
        LEFT JOIN eips e ON e.eip_number = pre.eip_number
        LEFT JOIN eip_snapshots s ON s.eip_id = e.id
        LEFT JOIN repositories r2 ON r2.id = s.repository_id
        WHERE pre.pr_number = $1
          AND pre.repository_id = $2
        ORDER BY pre.eip_number ASC
        `,
        pr.pr_number,
        pr.repository_id
      );

      const repoOwner = pr.repo_name || 'ethereum/EIPs';
      const prUrl = `https://github.com/${repoOwner}/pull/${pr.pr_number}`;
      const filesUrl = `${prUrl}/files`;
      const commitsUrl = `${prUrl}/commits`;

      const mapEventUrl = (e: {
        html_url: string | null;
        comment_id: string | null;
        review_id: string | null;
        event_type: string;
      }) => {
        if (e.html_url) return e.html_url;
        if ((e.event_type === 'commented' || e.event_type === 'issue_comment') && e.comment_id) {
          return `${prUrl}#issuecomment-${e.comment_id}`;
        }
        if (e.event_type === 'review_comment' && e.comment_id) {
          return `${prUrl}#discussion_r${e.comment_id}`;
        }
        if (e.event_type === 'reviewed' && e.review_id) {
          return `${prUrl}#pullrequestreview-${e.review_id}`;
        }
        return prUrl;
      };

      const conversationEventTypes = new Set(['commented', 'issue_comment', 'review_comment', 'reviewed']);
      const conversationFromEvents = events
        .filter((e) => conversationEventTypes.has(e.event_type))
        .map((e) => ({
          id: `event-${String(e.id)}`,
          kind: e.event_type,
          actor: e.actor,
          actorRole: e.actor_role,
          createdAt: e.created_at.toISOString(),
          reviewState: e.review_state,
          body: e.body,
          url: mapEventUrl(e),
          unresolved: e.unresolved,
        }));

      const conversationFromReviews = reviews.map((r) => ({
        id: `review-${String(r.id)}`,
        kind: 'reviewed',
        actor: r.reviewer,
        actorRole: 'REVIEWER',
        createdAt: r.submitted_at.toISOString(),
        reviewState: r.review_state,
        body: null as string | null,
        url: r.github_id ? `${prUrl}#pullrequestreview-${r.github_id}` : prUrl,
        unresolved: null as boolean | null,
      }));

      const conversation = [...conversationFromEvents, ...conversationFromReviews]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const timeline = events.map((e) => ({
        id: `timeline-${String(e.id)}`,
        type: e.event_type,
        actor: e.actor,
        actorRole: e.actor_role,
        createdAt: e.created_at.toISOString(),
        summary: e.label
          ? `${e.event_type.replace(/_/g, ' ')}: ${e.label}`
          : e.review_state
            ? `${e.event_type.replace(/_/g, ' ')} (${e.review_state})`
            : e.event_type.replace(/_/g, ' '),
        url: mapEventUrl(e),
        commitSha: e.commit_sha,
      }));

      const checksRaw = events.filter((e) => e.check_name || e.check_status || e.check_conclusion);
      const checks = checksRaw.map((e) => ({
        id: `check-${String(e.id)}`,
        name: e.check_name || 'Unnamed check',
        status: (e.check_conclusion || e.check_status || 'unknown').toLowerCase(),
        url: e.details_url || mapEventUrl(e),
      }));
      const failedChecks = checks.filter((c) => ['failure', 'failed', 'timed_out', 'cancelled', 'error'].includes(c.status));
      const pendingChecks = checks.filter((c) => ['queued', 'in_progress', 'pending', 'requested', 'waiting'].includes(c.status));
      const passedChecks = checks.filter((c) => ['success', 'passed', 'completed'].includes(c.status));

      const approvals = reviews.filter((r) => r.review_state === 'APPROVED').length;
      const changesRequested = reviews.filter((r) => r.review_state === 'CHANGES_REQUESTED').length;

      const checklist = {
        editorApprovalRequired: true,
        editorApprovalMet: approvals > 0,
        ciGreenRequired: checks.length > 0,
        ciGreenMet: failedChecks.length === 0 && pendingChecks.length === 0,
        requiredReviewsMet: approvals > 0 && changesRequested === 0,
        templateComplianceMet: true,
      };

      const blockers: string[] = [];
      if (failedChecks.length > 0) blockers.push(`Failing checks: ${failedChecks.slice(0, 2).map((c) => c.name).join(', ')}`);
      if (pendingChecks.length > 0) blockers.push(`Checks still running: ${pendingChecks.slice(0, 2).map((c) => c.name).join(', ')}`);
      if (changesRequested > 0) blockers.push(`${changesRequested} review(s) requested changes`);
      if (approvals === 0) blockers.push('Missing reviewer/editor approval');
      if ((pr.state || '').toLowerCase() !== 'open') blockers.push(`PR is ${pr.state?.toLowerCase() || 'closed'}`);

      const nextActions: string[] = [];
      if (failedChecks.length > 0) nextActions.push('Fix failing CI checks');
      if (changesRequested > 0) nextActions.push('Address requested changes and request re-review');
      if (approvals === 0) nextActions.push('Get at least one approval from reviewer/editor');
      if (nextActions.length === 0) nextActions.push('Ready for merge from governance perspective');

      const relatedProposals = related.map((r) => {
        const kind = r.category === 'ERC' ? 'ERC' : (r.repo_short === 'rips' ? 'RIP' : 'EIP');
        return {
          kind,
          number: r.eip_number,
          title: r.title,
          status: r.status,
          category: r.category,
          repo: r.repo_short || (kind === 'RIP' ? 'rips' : kind === 'ERC' ? 'ercs' : 'eips'),
          url: kind === 'RIP' ? `/rip/${r.eip_number}` : kind === 'ERC' ? `/erc/${r.eip_number}` : `/eip/${r.eip_number}`,
        };
      });

      return {
        pr: {
          number: pr.pr_number,
          repositoryId: pr.repository_id,
          repo: pr.repo_short,
          repoName: pr.repo_name,
          title: pr.title,
          author: pr.author,
          state: pr.state,
          createdAt: pr.created_at?.toISOString() ?? null,
          updatedAt: pr.updated_at?.toISOString() ?? null,
          mergedAt: pr.merged_at?.toISOString() ?? null,
          closedAt: pr.closed_at?.toISOString() ?? null,
          commits: pr.num_commits ?? 0,
          files: pr.num_files ?? 0,
          comments: pr.num_comments ?? 0,
          reviews: pr.num_reviews ?? 0,
          labels: pr.labels ?? [],
          body: pr.body ?? null,
          githubUrl: prUrl,
          filesUrl,
          commitsUrl,
        },
        governance: {
          stage: pr.governance_state || 'NO_STATE',
          waitingSince: pr.waiting_since?.toISOString() ?? null,
          lastActor: pr.last_actor,
          lastEventType: pr.last_event_type,
          checklist,
          blockers,
          nextActions,
        },
        checks: {
          total: checks.length,
          passed: passedChecks.length,
          failed: failedChecks.length,
          pending: pendingChecks.length,
          failedChecks: failedChecks,
          items: checks,
        },
        relatedProposals,
        conversation,
        timeline,
      };
    }),

  // Issue detail page payload (legacy parity route support)
  getIssueDetail: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']),
      number: z.number().int().positive(),
    }))
    .handler(async ({ input, context }) => {
      const issueRows = await prisma.$queryRawUnsafe<Array<{
        issue_number: number;
        repository_id: number;
        repo_name: string;
        repo_short: string;
        title: string | null;
        author: string | null;
        state: string | null;
        created_at: Date | null;
        updated_at: Date | null;
        closed_at: Date | null;
        labels: string[] | null;
        num_comments: number | null;
        body: string | null;
      }>>(
        `
        SELECT
          i.issue_number,
          i.repository_id,
          r.name AS repo_name,
          LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short,
          i.title,
          i.author,
          i.state,
          i.created_at,
          i.updated_at,
          i.closed_at,
          i.labels,
          i.num_comments,
          i.body
        FROM issues i
        JOIN repositories r ON r.id = i.repository_id
        WHERE i.issue_number = $1
          AND LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2)
        LIMIT 1
        `,
        input.number,
        input.repo
      );

      const issue = issueRows[0];
      if (!issue) return null;

      const events = await prisma.$queryRawUnsafe<Array<{
        id: bigint;
        event_type: string;
        actor: string;
        actor_role: string | null;
        created_at: Date;
        github_id: string | null;
        body: string | null;
        label: string | null;
        html_url: string | null;
        comment_id: string | null;
        review_id: string | null;
        milestone: string | null;
        assignee: string | null;
        referenced_url: string | null;
        related_pr_number: number | null;
      }>>(
        `
        SELECT
          e.id,
          e.event_type,
          e.actor,
          e.actor_role,
          e.created_at,
          e.github_id,
          e.metadata->>'body' AS body,
          COALESCE(e.metadata->>'label', e.metadata->>'name') AS label,
          e.metadata->>'html_url' AS html_url,
          e.metadata->>'comment_id' AS comment_id,
          e.metadata->>'review_id' AS review_id,
          COALESCE(e.metadata->>'milestone', e.metadata->>'milestone_title') AS milestone,
          COALESCE(e.metadata->>'assignee', e.metadata->>'assignee_login') AS assignee,
          COALESCE(e.metadata->>'referenced_url', e.metadata->>'source_url', e.metadata->>'target_url') AS referenced_url,
          CASE
            WHEN COALESCE(e.metadata->>'pr_number', '') ~ '^[0-9]+$' THEN (e.metadata->>'pr_number')::int
            ELSE NULL
          END AS related_pr_number
        FROM issue_events e
        WHERE e.issue_number = $1
          AND e.repository_id = $2
        ORDER BY e.created_at DESC
        `,
        issue.issue_number,
        issue.repository_id
      );

      const issueEipLinks = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        title: string | null;
        status: string | null;
        category: string | null;
        repo_short: string | null;
      }>>(
        `
        SELECT
          ie.eip_number,
          e.title,
          s.status,
          s.category,
          LOWER(SPLIT_PART(r2.name, '/', 2)) AS repo_short
        FROM issue_eips ie
        LEFT JOIN eips e ON e.eip_number = ie.eip_number
        LEFT JOIN LATERAL (
          SELECT s.status, s.category, s.repository_id
          FROM eip_snapshots s
          WHERE s.eip_id = e.id
          ORDER BY s.updated_at DESC NULLS LAST
          LIMIT 1
        ) s ON TRUE
        LEFT JOIN repositories r2 ON r2.id = s.repository_id
        WHERE ie.issue_number = $1
          AND ie.repository_id = $2
        ORDER BY ie.eip_number ASC
        `,
        issue.issue_number,
        issue.repository_id
      );

      const issueUrl = `https://github.com/${issue.repo_name}/issues/${issue.issue_number}`;

      const mapEventUrl = (e: {
        html_url: string | null;
        comment_id: string | null;
        review_id: string | null;
        event_type: string;
      }) => {
        if (e.html_url) return e.html_url;
        if ((e.event_type === 'commented' || e.event_type === 'issue_comment') && e.comment_id) {
          return `${issueUrl}#issuecomment-${e.comment_id}`;
        }
        if (e.event_type === 'review_comment' && e.comment_id) {
          return `${issueUrl}#discussion_r${e.comment_id}`;
        }
        if (e.event_type === 'reviewed' && e.review_id) {
          return `${issueUrl}#pullrequestreview-${e.review_id}`;
        }
        return issueUrl;
      };

      const textPool = [
        issue.title || '',
        issue.body || '',
        ...events.map((e) => e.body || ''),
      ].join('\n');

      const proposalRegex = /\b(EIP|ERC|RIP)[-\s#:]?(\d{1,6})\b/gi;
      const proposalFromText = new Map<string, { kind: 'EIP' | 'ERC' | 'RIP'; number: number }>();
      let proposalMatch: RegExpExecArray | null;
      while ((proposalMatch = proposalRegex.exec(textPool)) !== null) {
        const kind = proposalMatch[1].toUpperCase() as 'EIP' | 'ERC' | 'RIP';
        const number = Number(proposalMatch[2]);
        if (!Number.isFinite(number)) continue;
        proposalFromText.set(`${kind}-${number}`, { kind, number });
      }

      const linkedPRNumbers = new Set<number>();
      const pullUrlRegex = /\/pull\/(\d+)\b/gi;
      let pullMatch: RegExpExecArray | null;
      while ((pullMatch = pullUrlRegex.exec(textPool)) !== null) {
        const n = Number(pullMatch[1]);
        if (Number.isFinite(n)) linkedPRNumbers.add(n);
      }
      for (const e of events) {
        if (e.related_pr_number != null) linkedPRNumbers.add(e.related_pr_number);
        if (e.referenced_url) {
          let m: RegExpExecArray | null;
          while ((m = pullUrlRegex.exec(e.referenced_url)) !== null) {
            const n = Number(m[1]);
            if (Number.isFinite(n)) linkedPRNumbers.add(n);
          }
        }
      }

      const linkedPRArray = Array.from(linkedPRNumbers).sort((a, b) => a - b);
      const linkedPRRows = linkedPRArray.length
        ? await prisma.$queryRawUnsafe<Array<{
            pr_number: number;
            title: string | null;
            state: string | null;
            updated_at: Date | null;
            merged_at: Date | null;
          }>>(
            `
            SELECT pr.pr_number, pr.title, pr.state, pr.updated_at, pr.merged_at
            FROM pull_requests pr
            WHERE pr.repository_id = $1
              AND pr.pr_number = ANY($2::int[])
            ORDER BY pr.pr_number DESC
            `,
            issue.repository_id,
            linkedPRArray
          )
        : [];

      const mergedLinkedPR = linkedPRRows.find((r) => (r.state || '').toLowerCase() === 'merged' || r.merged_at != null);

      const tableProposalMap = new Map<string, {
        kind: 'EIP' | 'ERC' | 'RIP';
        number: number;
        title: string | null;
        status: string | null;
        category: string | null;
        repo: string;
        upgrades: string[];
      }>();
      for (const row of issueEipLinks) {
        const inferredKind = row.category === 'ERC' ? 'ERC' : (row.repo_short === 'rips' ? 'RIP' : 'EIP');
        const repo = row.repo_short || (inferredKind === 'RIP' ? 'rips' : inferredKind === 'ERC' ? 'ercs' : 'eips');
        tableProposalMap.set(`${inferredKind}-${row.eip_number}`, {
          kind: inferredKind,
          number: row.eip_number,
          title: row.title,
          status: row.status,
          category: row.category,
          repo,
          upgrades: [],
        });
      }

      for (const value of proposalFromText.values()) {
        const k = `${value.kind}-${value.number}`;
        if (!tableProposalMap.has(k)) {
          tableProposalMap.set(k, {
            kind: value.kind,
            number: value.number,
            title: null,
            status: null,
            category: null,
            repo: value.kind === 'RIP' ? 'rips' : value.kind === 'ERC' ? 'ercs' : 'eips',
            upgrades: [],
          });
        }
      }

      const allEipNumbers = Array.from(new Set(Array.from(tableProposalMap.values()).map((v) => v.number)));
      if (allEipNumbers.length > 0) {
        const upgradeRows = await prisma.$queryRawUnsafe<Array<{
          eip_number: number;
          slug: string;
          name: string | null;
        }>>(
          `
          SELECT
            ucc.eip_number,
            u.slug,
            u.name
          FROM upgrade_composition_current ucc
          JOIN upgrades u ON u.id = ucc.upgrade_id
          WHERE ucc.eip_number = ANY($1::int[])
          `,
          allEipNumbers
        );
        for (const row of upgradeRows) {
          for (const entry of tableProposalMap.values()) {
            if (entry.number === row.eip_number) {
              const label = row.name || row.slug;
              if (!entry.upgrades.includes(label)) entry.upgrades.push(label);
            }
          }
        }
      }

      const relatedProposals = Array.from(tableProposalMap.values())
        .sort((a, b) => a.number - b.number)
        .map((p) => ({
          kind: p.kind,
          number: p.number,
          title: p.title,
          status: p.status,
          category: p.category,
          repo: p.repo,
          upgrades: p.upgrades,
          url: p.kind === 'RIP' ? `/rip/${p.number}` : p.kind === 'ERC' ? `/erc/${p.number}` : `/eip/${p.number}`,
        }));

      const labelHistory = events
        .filter((e) => (e.event_type === 'labeled' || e.event_type === 'unlabeled') && !!e.label)
        .map((e) => ({
          id: `label-${String(e.id)}`,
          action: e.event_type === 'labeled' ? 'added' : 'removed',
          label: e.label || 'unknown',
          actor: e.actor,
          createdAt: e.created_at.toISOString(),
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      const assignees = Array.from(new Set(
        events
          .filter((e) => (e.event_type === 'assigned' || e.event_type === 'unassigned') && !!e.assignee)
          .map((e) => e.assignee!)
      ));

      const milestoneEvent = events.find((e) =>
        (e.event_type === 'milestoned' || e.event_type === 'demilestoned') && e.milestone
      );
      const currentMilestone = milestoneEvent?.milestone || null;

      let viewerHandle: string | null = null;
      if (context.user?.id) {
        const viewer = await prisma.user.findUnique({
          where: { id: context.user.id },
          select: { name: true },
        });
        if (viewer?.name && !viewer.name.includes(' ')) viewerHandle = viewer.name.toLowerCase();
      }

      const mentionRegex = /@([a-z0-9_-]+)/gi;
      const conversation = events
        .filter((e) => ['commented', 'issue_comment', 'edited'].includes(e.event_type) || !!e.body)
        .map((e) => {
          const mentions = new Set<string>();
          if (e.body) {
            let m: RegExpExecArray | null;
            while ((m = mentionRegex.exec(e.body)) !== null) {
              mentions.add(m[1].toLowerCase());
            }
          }
          return {
            id: `event-${String(e.id)}`,
            kind: e.event_type,
            actor: e.actor,
            actorRole: e.actor_role,
            createdAt: e.created_at.toISOString(),
            body: e.body,
            url: mapEventUrl(e),
            mentions: Array.from(mentions),
            isEditorLike: (e.actor_role || '').toLowerCase().includes('editor') || (e.actor_role || '').toLowerCase().includes('reviewer'),
            label: e.label,
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const timeline = events.map((e) => ({
        id: `timeline-${String(e.id)}`,
        type: e.event_type,
        actor: e.actor,
        actorRole: e.actor_role,
        createdAt: e.created_at.toISOString(),
        summary: e.label
          ? `${e.event_type.replace(/_/g, ' ')}: ${e.label}`
          : e.milestone
            ? `${e.event_type.replace(/_/g, ' ')}: ${e.milestone}`
            : e.assignee
              ? `${e.event_type.replace(/_/g, ' ')}: ${e.assignee}`
              : e.event_type.replace(/_/g, ' '),
        url: mapEventUrl(e),
      }));

      const normalizedLabels = (issue.labels || []).map((l) => l.toLowerCase());
      let impactType: 'INFORMATIONAL' | 'DISCUSSION' | 'BLOCKING' | 'DECISION' | 'EDITORIAL' = 'INFORMATIONAL';
      const impactSignals: string[] = [];

      if (normalizedLabels.some((l) => l.includes('last call'))) {
        impactType = 'DECISION';
        impactSignals.push('Last Call label present');
      }
      if (normalizedLabels.some((l) => l.includes('process') || l.includes('editor'))) {
        impactType = impactType === 'DECISION' ? 'DECISION' : 'EDITORIAL';
        impactSignals.push('Process/editor label detected');
      }
      if (normalizedLabels.some((l) => l.includes('block') || l.includes('objection'))) {
        impactType = 'BLOCKING';
        impactSignals.push('Blocking/objection label detected');
      }
      if (mergedLinkedPR) {
        impactType = 'DECISION';
        impactSignals.push(`Resolved via PR #${mergedLinkedPR.pr_number}`);
      }
      if (impactType === 'INFORMATIONAL' && ((issue.num_comments || 0) > 10 || conversation.length > 10)) {
        impactType = 'DISCUSSION';
        impactSignals.push('High discussion activity');
      }
      if (impactSignals.length === 0) impactSignals.push('No strong governance signal detected');

      const governanceImpactSummary =
        impactType === 'BLOCKING'
          ? 'Issue likely blocks progress until concerns are resolved.'
          : impactType === 'DECISION'
            ? 'Issue likely influenced or finalized a governance decision.'
            : impactType === 'EDITORIAL'
              ? 'Issue appears to be editorial/process clarification.'
              : impactType === 'DISCUSSION'
                ? 'Issue appears to be ongoing governance discussion.'
                : 'Issue appears informational with limited governance impact.';

      const linkedPRs = linkedPRRows.map((r) => ({
        number: r.pr_number,
        title: r.title,
        state: r.state,
        updatedAt: r.updated_at?.toISOString() ?? null,
        relationship: mergedLinkedPR?.pr_number === r.pr_number ? 'Resolved via' : 'Referenced in',
        url: `https://github.com/${issue.repo_name}/pull/${r.pr_number}`,
      }));

      return {
        issue: {
          number: issue.issue_number,
          repositoryId: issue.repository_id,
          repo: issue.repo_short,
          repoName: issue.repo_name,
          title: issue.title,
          author: issue.author,
          state: issue.state,
          createdAt: issue.created_at?.toISOString() ?? null,
          updatedAt: issue.updated_at?.toISOString() ?? null,
          closedAt: issue.closed_at?.toISOString() ?? null,
          labels: issue.labels ?? [],
          comments: issue.num_comments ?? 0,
          body: issue.body ?? '',
          githubUrl: issueUrl,
        },
        metadata: {
          assignees,
          milestone: currentMilestone,
        },
        viewer: {
          handle: viewerHandle,
        },
        governanceImpact: {
          type: impactType,
          summary: governanceImpactSummary,
          signals: impactSignals,
        },
        labelHistory,
        relatedProposals,
        linkedPRs,
        conversation,
        timeline,
      };
    }),

  // ——— Contributors Analytics ———
  getContributorKPIs: optionalAuthProcedure
    .input(z.object({}))
    .handler(async () => {
      return getContributorKPIsCached();
    }),

  getContributorActivityByType: optionalAuthProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      return getContributorActivityByTypeCached(
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null
      );
    }),

  getContributorActivityByRepo: optionalAuthProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      return getContributorActivityByRepoCached(
        input.from ?? null,
        input.to ?? null
      );
    }),

  getContributorRankings: optionalAuthProcedure
    .input(z.object({
      sortBy: z.enum(['total', 'reviews', 'status_changes', 'prs_authored', 'prs_reviewed']).optional().default('total'),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        actor: string;
        total: bigint;
        reviews: bigint;
        status_changes: bigint;
        prs_authored: bigint;
        prs_reviewed: bigint;
      }>>(
        `
        WITH filtered AS (
          SELECT ca.actor, ca.action_type, ca.pr_number
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            AND ($2::text IS NULL OR ca.occurred_at >= $2::timestamp)
            AND ($3::text IS NULL OR ca.occurred_at <= $3::timestamp)
        ),
        agg AS (
          SELECT actor,
            COUNT(*)::bigint AS total,
            COUNT(*) FILTER (WHERE action_type = 'reviewed')::bigint AS reviews,
            COUNT(*) FILTER (WHERE action_type = 'status_change')::bigint AS status_changes,
            COUNT(DISTINCT pr_number) FILTER (WHERE action_type = 'opened')::bigint AS prs_authored,
            COUNT(DISTINCT pr_number) FILTER (WHERE action_type = 'reviewed')::bigint AS prs_reviewed
          FROM filtered
          GROUP BY actor
        )
        SELECT * FROM agg
        ORDER BY total DESC
        LIMIT $4
      `,
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null,
        input.limit
      );
      const rows = results.map((r) => ({
        actor: r.actor,
        total: Number(r.total),
        reviews: Number(r.reviews),
        statusChanges: Number(r.status_changes),
        prsAuthored: Number(r.prs_authored),
        prsReviewed: Number(r.prs_reviewed),
      }));
      const key = input.sortBy === 'reviews' ? 'reviews' : input.sortBy === 'status_changes' ? 'statusChanges' : input.sortBy === 'prs_authored' ? 'prsAuthored' : input.sortBy === 'prs_reviewed' ? 'prsReviewed' : 'total';
      rows.sort((a, b) => (b[key as keyof typeof b] as number) - (a[key as keyof typeof a] as number));
      return rows;
    }),

  getContributorProfile: optionalAuthProcedure
    .input(z.object({
      actor: z.string(),
      limit: z.number().optional().default(300),
      months: z.number().optional().default(24),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      const repo = input.repo ?? null;
      const from = input.from ?? null;
      const to = input.to ?? null;

      const actorLookup = await prisma.$queryRawUnsafe<Array<{ actor: string }>>(
        `
        SELECT ca.actor
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE LOWER(ca.actor) = LOWER($1)
          AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
        GROUP BY ca.actor
        ORDER BY COUNT(*) DESC
        LIMIT 1
      `,
        input.actor,
        repo
      );

      const actor = actorLookup[0]?.actor ?? input.actor;

      const [
        summaryRows,
        actionRows,
        repoRows,
        monthlyRows,
        timelineRows,
        detailedTimelineRows,
        involvedPRRows,
        topMonthRows,
        topActionRows,
        toppedMonthsRows,
        allTimeRankRows,
        monthRankRows,
        editorRankRows,
        reviewerRankRows,
        authoredRows,
        prDetailsRows,
        issueDetailsRows,
      ] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{
          total_activities: bigint;
          prs_touched: bigint;
          first_activity: Date | null;
          last_activity: Date | null;
          reviews: bigint;
          comments: bigint;
          commits: bigint;
          opened: bigint;
          status_changes: bigint;
        }>>(
          `
          SELECT
            COUNT(*)::bigint AS total_activities,
            COUNT(DISTINCT ca.pr_number)::bigint AS prs_touched,
            MIN(ca.occurred_at) AS first_activity,
            MAX(ca.occurred_at) AS last_activity,
            COUNT(*) FILTER (WHERE ca.action_type = 'reviewed')::bigint AS reviews,
            COUNT(*) FILTER (WHERE ca.action_type IN ('commented', 'issue_comment'))::bigint AS comments,
            COUNT(*) FILTER (WHERE ca.action_type = 'committed')::bigint AS commits,
            COUNT(*) FILTER (WHERE ca.action_type = 'opened')::bigint AS opened,
            COUNT(*) FILTER (WHERE ca.action_type = 'status_change')::bigint AS status_changes
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE LOWER(ca.actor) = LOWER($1)
            AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
            AND ($3::text IS NULL OR ca.occurred_at >= $3::timestamp)
            AND ($4::text IS NULL OR ca.occurred_at <= $4::timestamp)
        `,
          actor,
          repo,
          from,
          to
        ),
        prisma.$queryRawUnsafe<Array<{ action_type: string; count: bigint }>>(
          `
          SELECT ca.action_type, COUNT(*)::bigint AS count
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE LOWER(ca.actor) = LOWER($1)
            AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
            AND ($3::text IS NULL OR ca.occurred_at >= $3::timestamp)
            AND ($4::text IS NULL OR ca.occurred_at <= $4::timestamp)
          GROUP BY ca.action_type
          ORDER BY count DESC
        `,
          actor,
          repo,
          from,
          to
        ),
        prisma.$queryRawUnsafe<Array<{ repo: string; count: bigint }>>(
          `
          SELECT COALESCE(r.name, 'Unknown') AS repo, COUNT(*)::bigint AS count
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE LOWER(ca.actor) = LOWER($1)
            AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
            AND ($3::text IS NULL OR ca.occurred_at >= $3::timestamp)
            AND ($4::text IS NULL OR ca.occurred_at <= $4::timestamp)
          GROUP BY r.name
          ORDER BY count DESC
        `,
          actor,
          repo,
          from,
          to
        ),
        prisma.$queryRawUnsafe<Array<{ month: string; action_type: string; count: bigint }>>(
          `
          SELECT
            TO_CHAR(date_trunc('month', ca.occurred_at), 'YYYY-MM') AS month,
            ca.action_type,
            COUNT(*)::bigint AS count
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE LOWER(ca.actor) = LOWER($1)
            AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
            AND ($3::text IS NULL OR ca.occurred_at >= $3::timestamp)
            AND ($4::text IS NULL OR ca.occurred_at <= $4::timestamp)
            AND ($3::text IS NOT NULL OR ca.occurred_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $5))
          GROUP BY date_trunc('month', ca.occurred_at), ca.action_type
          ORDER BY month ASC, ca.action_type ASC
        `,
          actor,
          repo,
          from,
          to,
          (input.months || 24) - 1
        ),
        prisma.$queryRawUnsafe<Array<{
          action_type: string;
          role: string | null;
          pr_number: number;
          repo: string | null;
          occurred_at: Date;
        }>>(
          `
          SELECT
            ca.action_type,
            ca.role,
            ca.pr_number,
            r.name AS repo,
            ca.occurred_at
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE LOWER(ca.actor) = LOWER($1)
            AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
            AND ($3::text IS NULL OR ca.occurred_at >= $3::timestamp)
            AND ($4::text IS NULL OR ca.occurred_at <= $4::timestamp)
          ORDER BY ca.occurred_at DESC
          LIMIT $5
        `,
          actor,
          repo,
          from,
          to,
          input.limit
        ),
        prisma.$queryRawUnsafe<Array<{
          action_type: string;
          role: string | null;
          pr_number: number;
          repo: string | null;
          occurred_at: Date;
          pr_title: string | null;
          pr_state: string | null;
          governance_state: string | null;
          pr_labels: string[] | null;
          event_type: string | null;
          github_id: string | null;
          commit_sha: string | null;
        }>>(
          `
          SELECT
            ca.action_type,
            ca.role,
            ca.pr_number,
            r.name AS repo,
            ca.occurred_at,
            pr.title AS pr_title,
            pr.state AS pr_state,
            gs.current_state AS governance_state,
            pr.labels AS pr_labels,
            pe.event_type,
            pe.github_id,
            pe.commit_sha
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          LEFT JOIN pull_requests pr ON pr.pr_number = ca.pr_number AND pr.repository_id = ca.repository_id
          LEFT JOIN pr_governance_state gs ON gs.pr_number = ca.pr_number AND gs.repository_id = ca.repository_id
          LEFT JOIN LATERAL (
            SELECT
              e.event_type,
              e.github_id,
              e.commit_sha,
              e.created_at
            FROM pr_events e
            WHERE e.pr_number = ca.pr_number
              AND e.repository_id = ca.repository_id
              AND LOWER(e.actor) = LOWER(ca.actor)
              AND e.created_at BETWEEN ca.occurred_at - INTERVAL '12 hours' AND ca.occurred_at + INTERVAL '12 hours'
            ORDER BY ABS(EXTRACT(EPOCH FROM (e.created_at - ca.occurred_at))) ASC
            LIMIT 1
          ) pe ON TRUE
          WHERE LOWER(ca.actor) = LOWER($1)
            AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
            AND ($3::text IS NULL OR ca.occurred_at >= $3::timestamp)
            AND ($4::text IS NULL OR ca.occurred_at <= $4::timestamp)
          ORDER BY ca.occurred_at DESC
          LIMIT $5
        `,
          actor,
          repo,
          from,
          to,
          input.limit
        ),
        prisma.$queryRawUnsafe<Array<{
          pr_number: number;
          repo: string | null;
          title: string | null;
          state: string | null;
          governance_state: string | null;
          created_at: Date | null;
          updated_at: Date | null;
          merged_at: Date | null;
          closed_at: Date | null;
          total_actions: bigint;
          actions_breakdown: string[];
          last_occurred_at: Date;
        }>>(
          `
          WITH activity_by_pr AS (
            SELECT
              ca.pr_number,
              ca.repository_id,
              COUNT(*)::bigint AS total_actions,
              MAX(ca.occurred_at) AS last_occurred_at,
              ARRAY(
                SELECT (x.action_type || ':' || x.cnt::text)
                FROM (
                  SELECT action_type, COUNT(*)::bigint AS cnt
                  FROM contributor_activity ca2
                  WHERE ca2.pr_number = ca.pr_number
                    AND ca2.repository_id = ca.repository_id
                    AND LOWER(ca2.actor) = LOWER($1)
                    AND ($2::text IS NULL OR ca2.occurred_at >= $2::timestamp)
                    AND ($3::text IS NULL OR ca2.occurred_at <= $3::timestamp)
                  GROUP BY action_type
                  ORDER BY cnt DESC, action_type ASC
                ) x
              ) AS actions_breakdown
            FROM contributor_activity ca
            LEFT JOIN repositories r ON r.id = ca.repository_id
            WHERE LOWER(ca.actor) = LOWER($1)
              AND ($4::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($4))
              AND ($2::text IS NULL OR ca.occurred_at >= $2::timestamp)
              AND ($3::text IS NULL OR ca.occurred_at <= $3::timestamp)
            GROUP BY ca.pr_number, ca.repository_id
          )
          SELECT
            abp.pr_number,
            r.name AS repo,
            pr.title,
            pr.state,
            gs.current_state AS governance_state,
            pr.created_at,
            pr.updated_at,
            pr.merged_at,
            pr.closed_at,
            abp.total_actions,
            abp.actions_breakdown,
            abp.last_occurred_at
          FROM activity_by_pr abp
          LEFT JOIN repositories r ON r.id = abp.repository_id
          LEFT JOIN pull_requests pr ON pr.pr_number = abp.pr_number AND pr.repository_id = abp.repository_id
          LEFT JOIN pr_governance_state gs ON gs.pr_number = abp.pr_number AND gs.repository_id = abp.repository_id
          ORDER BY abp.last_occurred_at DESC
          LIMIT 300
        `,
          actor,
          from,
          to,
          repo
        ),
        prisma.$queryRawUnsafe<Array<{ month: string; count: bigint }>>(
          `
          SELECT
            TO_CHAR(date_trunc('month', ca.occurred_at), 'YYYY-MM') AS month,
            COUNT(*)::bigint AS count
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE LOWER(ca.actor) = LOWER($1)
            AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
            AND ($3::text IS NULL OR ca.occurred_at >= $3::timestamp)
            AND ($4::text IS NULL OR ca.occurred_at <= $4::timestamp)
          GROUP BY date_trunc('month', ca.occurred_at)
          ORDER BY count DESC, month DESC
          LIMIT 1
        `,
          actor,
          repo,
          from,
          to
        ),
        prisma.$queryRawUnsafe<Array<{ action_type: string; month: string; count: bigint }>>(
          `
          WITH per_month AS (
            SELECT
              ca.action_type,
              TO_CHAR(date_trunc('month', ca.occurred_at), 'YYYY-MM') AS month,
              COUNT(*)::bigint AS count
            FROM contributor_activity ca
            LEFT JOIN repositories r ON r.id = ca.repository_id
            WHERE LOWER(ca.actor) = LOWER($1)
              AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
              AND ($3::text IS NULL OR ca.occurred_at >= $3::timestamp)
              AND ($4::text IS NULL OR ca.occurred_at <= $4::timestamp)
            GROUP BY ca.action_type, date_trunc('month', ca.occurred_at)
          ),
          ranked AS (
            SELECT
              action_type,
              month,
              count,
              ROW_NUMBER() OVER (PARTITION BY action_type ORDER BY count DESC, month DESC) AS rn
            FROM per_month
          )
          SELECT action_type, month, count
          FROM ranked
          WHERE rn = 1
          ORDER BY count DESC
        `,
          actor,
          repo,
          from,
          to
        ),
        prisma.$queryRawUnsafe<Array<{ topped_months: bigint }>>(
          `
          WITH monthly_actor AS (
            SELECT
              TO_CHAR(date_trunc('month', ca.occurred_at), 'YYYY-MM') AS month,
              ca.actor,
              COUNT(*)::bigint AS total
            FROM contributor_activity ca
            LEFT JOIN repositories r ON r.id = ca.repository_id
            WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            GROUP BY date_trunc('month', ca.occurred_at), ca.actor
          ),
          ranked AS (
            SELECT
              month,
              actor,
              RANK() OVER (PARTITION BY month ORDER BY total DESC) AS rank_in_month
            FROM monthly_actor
          )
          SELECT COUNT(*)::bigint AS topped_months
          FROM ranked
          WHERE LOWER(actor) = LOWER($2) AND rank_in_month = 1
        `,
          repo,
          actor
        ),
        prisma.$queryRawUnsafe<Array<{ total_rank: number; reviews_rank: number; participants: bigint }>>(
          `
          WITH agg AS (
            SELECT
              ca.actor,
              COUNT(*)::bigint AS total,
              COUNT(*) FILTER (WHERE ca.action_type = 'reviewed')::bigint AS reviews
            FROM contributor_activity ca
            LEFT JOIN repositories r ON r.id = ca.repository_id
            WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            GROUP BY ca.actor
          ),
          ranked AS (
            SELECT
              actor,
              RANK() OVER (ORDER BY total DESC) AS total_rank,
              RANK() OVER (ORDER BY reviews DESC) AS reviews_rank,
              COUNT(*) OVER ()::bigint AS participants
            FROM agg
          )
          SELECT total_rank, reviews_rank, participants
          FROM ranked
          WHERE LOWER(actor) = LOWER($2)
          LIMIT 1
        `,
          repo,
          actor
        ),
        prisma.$queryRawUnsafe<Array<{ total_rank: number; reviews_rank: number; participants: bigint }>>(
          `
          WITH agg AS (
            SELECT
              ca.actor,
              COUNT(*)::bigint AS total,
              COUNT(*) FILTER (WHERE ca.action_type = 'reviewed')::bigint AS reviews
            FROM contributor_activity ca
            LEFT JOIN repositories r ON r.id = ca.repository_id
            WHERE ca.occurred_at >= date_trunc('month', NOW())
              AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            GROUP BY ca.actor
          ),
          ranked AS (
            SELECT
              actor,
              RANK() OVER (ORDER BY total DESC) AS total_rank,
              RANK() OVER (ORDER BY reviews DESC) AS reviews_rank,
              COUNT(*) OVER ()::bigint AS participants
            FROM agg
          )
          SELECT total_rank, reviews_rank, participants
          FROM ranked
          WHERE LOWER(actor) = LOWER($2)
          LIMIT 1
        `,
          repo,
          actor
        ),
        prisma.$queryRawUnsafe<Array<{ role_rank: number; participants: bigint }>>(
          `
          WITH agg AS (
            SELECT
              ca.actor,
              COUNT(*)::bigint AS total
            FROM contributor_activity ca
            LEFT JOIN repositories r ON r.id = ca.repository_id
            WHERE UPPER(ca.role) = 'EDITOR'
              AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            GROUP BY ca.actor
          ),
          ranked AS (
            SELECT
              actor,
              RANK() OVER (ORDER BY total DESC) AS role_rank,
              COUNT(*) OVER ()::bigint AS participants
            FROM agg
          )
          SELECT role_rank, participants
          FROM ranked
          WHERE LOWER(actor) = LOWER($2)
          LIMIT 1
        `,
          repo,
          actor
        ),
        prisma.$queryRawUnsafe<Array<{ role_rank: number; participants: bigint }>>(
          `
          WITH agg AS (
            SELECT
              ca.actor,
              COUNT(*)::bigint AS total
            FROM contributor_activity ca
            LEFT JOIN repositories r ON r.id = ca.repository_id
            WHERE (UPPER(ca.role) = 'REVIEWER' OR (ca.action_type = 'reviewed' AND (ca.role IS NULL OR UPPER(ca.role) != 'EDITOR')))
              AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            GROUP BY ca.actor
          ),
          ranked AS (
            SELECT
              actor,
              RANK() OVER (ORDER BY total DESC) AS role_rank,
              COUNT(*) OVER ()::bigint AS participants
            FROM agg
          )
          SELECT role_rank, participants
          FROM ranked
          WHERE LOWER(actor) = LOWER($2)
          LIMIT 1
        `,
          repo,
          actor
        ),
        prisma.$queryRawUnsafe<Array<{
          prs_authored: bigint;
          prs_merged: bigint;
          issues_authored: bigint;
          eips_authored: bigint;
        }>>(
          `
          SELECT
            (
              SELECT COUNT(*)::bigint
              FROM pull_requests pr
              LEFT JOIN repositories r ON r.id = pr.repository_id
              WHERE LOWER(COALESCE(pr.author, '')) = LOWER($1)
                AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
            ) AS prs_authored,
            (
              SELECT COUNT(*)::bigint
              FROM pull_requests pr
              LEFT JOIN repositories r ON r.id = pr.repository_id
              WHERE LOWER(COALESCE(pr.author, '')) = LOWER($1)
                AND pr.merged_at IS NOT NULL
                AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
            ) AS prs_merged,
            (
              SELECT COUNT(*)::bigint
              FROM issues i
              LEFT JOIN repositories r ON r.id = i.repository_id
              WHERE LOWER(COALESCE(i.author, '')) = LOWER($1)
                AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
            ) AS issues_authored,
            (
              SELECT COUNT(*)::bigint
              FROM eips e
              WHERE COALESCE(e.author, '') ILIKE '%' || $1 || '%'
            ) AS eips_authored
        `,
          actor,
          repo
        ),
        prisma.$queryRawUnsafe<Array<{
          pr_number: number;
          repo: string | null;
          title: string | null;
          state: string | null;
          created_at: Date | null;
          merged_at: Date | null;
          closed_at: Date | null;
          updated_at: Date | null;
          labels: string[] | null;
          governance_state: string | null;
        }>>(
          `
          SELECT
            pr.pr_number,
            r.name AS repo,
            pr.title,
            pr.state,
            pr.created_at,
            pr.merged_at,
            pr.closed_at,
            pr.updated_at,
            pr.labels,
            gs.current_state AS governance_state
          FROM pull_requests pr
          LEFT JOIN repositories r ON r.id = pr.repository_id
          LEFT JOIN pr_governance_state gs ON gs.pr_number = pr.pr_number AND gs.repository_id = pr.repository_id
          WHERE LOWER(COALESCE(pr.author, '')) = LOWER($1)
            AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
          ORDER BY COALESCE(pr.updated_at, pr.created_at) DESC
          LIMIT 200
        `,
          actor,
          repo
        ),
        prisma.$queryRawUnsafe<Array<{
          issue_number: number;
          repo: string | null;
          title: string | null;
          state: string | null;
          created_at: Date | null;
          updated_at: Date | null;
          closed_at: Date | null;
          labels: string[] | null;
        }>>(
          `
          SELECT
            i.issue_number,
            r.name AS repo,
            i.title,
            i.state,
            i.created_at,
            i.updated_at,
            i.closed_at,
            i.labels
          FROM issues i
          LEFT JOIN repositories r ON r.id = i.repository_id
          WHERE LOWER(COALESCE(i.author, '')) = LOWER($1)
            AND ($2::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($2))
          ORDER BY COALESCE(i.updated_at, i.created_at) DESC
          LIMIT 200
        `,
          actor,
          repo
        ),
      ]);

      const summary = summaryRows[0] || {
        total_activities: BigInt(0),
        prs_touched: BigInt(0),
        first_activity: null,
        last_activity: null,
        reviews: BigInt(0),
        comments: BigInt(0),
        commits: BigInt(0),
        opened: BigInt(0),
        status_changes: BigInt(0),
      };

      const authored = authoredRows[0] || {
        prs_authored: BigInt(0),
        prs_merged: BigInt(0),
        issues_authored: BigInt(0),
        eips_authored: BigInt(0),
      };

      const monthlyMap = new Map<string, Map<string, number>>();
      for (const row of monthlyRows) {
        if (!monthlyMap.has(row.month)) {
          monthlyMap.set(row.month, new Map<string, number>());
        }
        monthlyMap.get(row.month)!.set(row.action_type, Number(row.count));
      }

      const monthlyActivity = Array.from(monthlyMap.entries()).map(([month, actions]) => {
        const actionCounts = Array.from(actions.entries()).map(([actionType, count]) => ({
          actionType,
          count,
        }));
        const total = actionCounts.reduce((acc, item) => acc + item.count, 0);
        return { month, total, actionCounts };
      });

      return {
        actor,
        summary: {
          totalActivities: Number(summary.total_activities),
          prsTouched: Number(summary.prs_touched),
          firstActivity: summary.first_activity?.toISOString() ?? null,
          lastActivity: summary.last_activity?.toISOString() ?? null,
          reviews: Number(summary.reviews),
          comments: Number(summary.comments),
          commits: Number(summary.commits),
          opened: Number(summary.opened),
          statusChanges: Number(summary.status_changes),
          prsAuthored: Number(authored.prs_authored),
          prsMerged: Number(authored.prs_merged),
          issuesAuthored: Number(authored.issues_authored),
          eipsAuthored: Number(authored.eips_authored),
        },
        actionBreakdown: actionRows.map((r) => ({
          actionType: r.action_type,
          count: Number(r.count),
        })),
        repoBreakdown: repoRows.map((r) => ({
          repo: r.repo,
          count: Number(r.count),
        })),
        monthlyActivity,
        timeline: timelineRows.map((r) => ({
          actionType: r.action_type,
          role: r.role,
          prNumber: r.pr_number,
          repo: r.repo,
          occurredAt: r.occurred_at.toISOString(),
        })),
        activityDetails: detailedTimelineRows.map((r) => ({
          actionType: r.action_type,
          role: r.role,
          prNumber: r.pr_number,
          repo: r.repo,
          occurredAt: r.occurred_at.toISOString(),
          prTitle: r.pr_title,
          prState: r.pr_state,
          governanceState: r.governance_state,
          prLabels: r.pr_labels ?? [],
          eventType: r.event_type,
          githubId: r.github_id,
          commitSha: r.commit_sha,
        })),
        involvedPRs: involvedPRRows.map((r) => ({
          prNumber: r.pr_number,
          repo: r.repo,
          title: r.title,
          state: r.state,
          governanceState: r.governance_state,
          createdAt: r.created_at?.toISOString() ?? null,
          updatedAt: r.updated_at?.toISOString() ?? null,
          mergedAt: r.merged_at?.toISOString() ?? null,
          closedAt: r.closed_at?.toISOString() ?? null,
          totalActions: Number(r.total_actions),
          actionsBreakdown: r.actions_breakdown ?? [],
          lastOccurredAt: r.last_occurred_at.toISOString(),
        })),
        peaks: {
          topMonth: topMonthRows[0]
            ? {
                month: topMonthRows[0].month,
                count: Number(topMonthRows[0].count),
              }
            : null,
          topActionMonths: topActionRows.map((r) => ({
            actionType: r.action_type,
            month: r.month,
            count: Number(r.count),
          })),
          toppedMonths: Number(toppedMonthsRows[0]?.topped_months ?? 0),
        },
        leaderboard: {
          allTime: {
            totalRank: allTimeRankRows[0]?.total_rank ?? null,
            reviewsRank: allTimeRankRows[0]?.reviews_rank ?? null,
            participants: Number(allTimeRankRows[0]?.participants ?? 0),
          },
          thisMonth: {
            totalRank: monthRankRows[0]?.total_rank ?? null,
            reviewsRank: monthRankRows[0]?.reviews_rank ?? null,
            participants: Number(monthRankRows[0]?.participants ?? 0),
          },
          editor: {
            rank: editorRankRows[0]?.role_rank ?? null,
            participants: Number(editorRankRows[0]?.participants ?? 0),
          },
          reviewer: {
            rank: reviewerRankRows[0]?.role_rank ?? null,
            participants: Number(reviewerRankRows[0]?.participants ?? 0),
          },
        },
        authoredPRs: prDetailsRows.map((r) => ({
          prNumber: r.pr_number,
          repo: r.repo,
          title: r.title,
          state: r.state,
          createdAt: r.created_at?.toISOString() ?? null,
          mergedAt: r.merged_at?.toISOString() ?? null,
          closedAt: r.closed_at?.toISOString() ?? null,
          updatedAt: r.updated_at?.toISOString() ?? null,
          labels: r.labels ?? [],
          governanceState: r.governance_state,
        })),
        authoredIssues: issueDetailsRows.map((r) => ({
          issueNumber: r.issue_number,
          repo: r.repo,
          title: r.title,
          state: r.state,
          createdAt: r.created_at?.toISOString() ?? null,
          updatedAt: r.updated_at?.toISOString() ?? null,
          closedAt: r.closed_at?.toISOString() ?? null,
          labels: r.labels ?? [],
        })),
      };
    }),

  getContributorLiveFeed: optionalAuthProcedure
    .input(z.object({ hours: z.number().optional().default(48), limit: z.number().optional().default(50) }))
    .handler(async ({ input }) => {
      const since = new Date(Date.now() - input.hours * 60 * 60 * 1000);
      const activities = await prisma.contributor_activity.findMany({
        where: { occurred_at: { gte: since } },
        orderBy: { occurred_at: 'desc' },
        take: input.limit,
        include: { repositories: true },
      });
      return activities.map((a) => ({
        actor: a.actor,
        actionType: a.action_type,
        prNumber: a.pr_number,
        repo: a.repositories?.name ?? null,
        occurredAt: a.occurred_at.toISOString(),
      }));
    }),

  getContributorDailyActivity: optionalAuthProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      actor: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        date: string;
        count: bigint;
      }>>(
        `
        SELECT
          TO_CHAR(date_trunc('day', ca.occurred_at), 'YYYY-MM-DD') AS date,
          COUNT(*)::bigint AS count
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE ($1::text IS NULL OR ca.actor = $1)
          AND ($2::text IS NULL OR ca.occurred_at >= $2::timestamp)
          AND ($3::text IS NULL OR ca.occurred_at <= $3::timestamp)
          AND ($4::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($4))
        GROUP BY date_trunc('day', ca.occurred_at)
        ORDER BY date ASC
      `,
        input.actor ?? null,
        input.from ?? null,
        input.to ?? null,
        input.repo ?? null
      );

      return results.map((r) => ({
        date: r.date,
        count: Number(r.count),
      }));
    }),

  getEditorDailyActivity: optionalAuthProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      actor: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        date: string;
        count: bigint;
      }>>(
        `
        WITH editor_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($5::text[], $6::text[]) AS x(canonical, actor_lc)
        ),
        raw_events AS (
          SELECT
            em.canonical AS actor,
            pe.repository_id,
            CASE
              WHEN pe.created_at > COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at) + INTERVAL '30 days'
                THEN COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at)
              ELSE pe.created_at
            END AS occurred_at
          FROM pr_events pe
          JOIN editor_map em ON LOWER(pe.actor) = em.actor_lc
          LEFT JOIN pull_requests pr ON pr.pr_number = pe.pr_number AND pr.repository_id = pe.repository_id
          WHERE pe.pr_number > 0
            AND pe.created_at <= NOW()
            AND pe.event_type NOT IN ('subscribed', 'mentioned', 'referenced')
        )
        SELECT
          TO_CHAR(date_trunc('day', re.occurred_at), 'YYYY-MM-DD') AS date,
          COUNT(*)::bigint AS count
        FROM raw_events re
        LEFT JOIN repositories r ON r.id = re.repository_id
        WHERE ($1::text IS NULL OR LOWER(re.actor) = LOWER($1))
          AND ($2::text IS NULL OR re.occurred_at >= $2::timestamp)
          AND ($3::text IS NULL OR re.occurred_at <= $3::timestamp)
          AND ($4::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($4))
        GROUP BY date_trunc('day', re.occurred_at)
        ORDER BY date ASC
      `,
        input.actor ?? null,
        input.from ?? null,
        input.to ?? null,
        input.repo ?? null,
        Array.from(CANONICAL_EIP_EDITORS),
        CANONICAL_EIP_EDITOR_LOWER
      );

      return results.map((r) => ({
        date: r.date,
        count: Number(r.count),
      }));
    }),

  getEditorDailyActivityStacked: optionalAuthProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        date: string;
        actor: string;
        count: bigint;
      }>>(
        `
        WITH editor_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($4::text[], $5::text[]) AS x(canonical, actor_lc)
        ),
        raw_events AS (
          SELECT
            em.canonical AS actor,
            pe.pr_number,
            pe.repository_id,
            pe.event_type,
            CASE
              WHEN pe.created_at > COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at) + INTERVAL '30 days'
                THEN COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at)
              ELSE pe.created_at
            END AS occurred_at
          FROM pr_events pe
          JOIN editor_map em ON LOWER(pe.actor) = em.actor_lc
          LEFT JOIN pull_requests pr ON pr.pr_number = pe.pr_number AND pr.repository_id = pe.repository_id
          WHERE pe.pr_number > 0
            AND pe.created_at <= NOW()
            AND pe.event_type NOT IN ('subscribed', 'mentioned', 'referenced')
        ),
        deduped_events AS (
          SELECT
            actor,
            pr_number,
            repository_id,
            event_type,
            date_trunc('second', occurred_at) AS occurred_at
          FROM raw_events
          GROUP BY actor, pr_number, repository_id, event_type, date_trunc('second', occurred_at)
        )
        SELECT
          TO_CHAR(date_trunc('day', de.occurred_at), 'YYYY-MM-DD') AS date,
          de.actor,
          COUNT(*)::bigint AS count
        FROM deduped_events de
        LEFT JOIN repositories r ON r.id = de.repository_id
        WHERE ($1::text IS NULL OR de.occurred_at >= $1::timestamp)
          AND ($2::text IS NULL OR de.occurred_at < (($2::date + INTERVAL '1 day')::timestamp))
          AND ($3::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($3))
        GROUP BY date_trunc('day', de.occurred_at), de.actor
        ORDER BY date ASC, de.actor ASC
      `,
        input.from ?? null,
        input.to ?? null,
        input.repo ?? null,
        Array.from(CANONICAL_EIP_EDITORS),
        CANONICAL_EIP_EDITOR_LOWER
      );

      return results.map((r) => ({
        date: r.date,
        actor: r.actor,
        count: Number(r.count),
      }));
    }),

  getEditorActionDetails: optionalAuthProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      limit: z.number().optional().default(500),
    }))
    .handler(async ({ input }) => {
      const rows = await prisma.$queryRawUnsafe<Array<{
        actor: string;
        event_type: string;
        acted_at: string;
        pr_number: number;
        repo_short: string | null;
        title: string | null;
        event_url: string | null;
      }>>(
        `
        WITH editor_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($5::text[], $6::text[]) AS x(canonical, actor_lc)
        ),
        raw_events AS (
          SELECT
            em.canonical AS actor,
            pe.event_type,
            pe.pr_number,
            pe.repository_id,
            CASE
              WHEN pe.created_at > COALESCE(pr.closed_at, pr.merged_at, NOW()) + INTERVAL '30 days'
                THEN COALESCE(pr.closed_at, pr.merged_at, pr.created_at, pe.created_at)
              ELSE pe.created_at
            END AS occurred_at
          FROM pr_events pe
          JOIN editor_map em ON LOWER(pe.actor) = em.actor_lc
          LEFT JOIN pull_requests pr ON pr.pr_number = pe.pr_number AND pr.repository_id = pe.repository_id
          WHERE pe.pr_number > 0
            AND pe.event_type NOT IN ('subscribed', 'mentioned', 'referenced')
        )
        SELECT
          re.actor,
          re.event_type,
          TO_CHAR(re.occurred_at, 'YYYY-MM-DD HH24:MI:SS') AS acted_at,
          re.pr_number,
          LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short,
          pr.title,
          CONCAT('https://github.com/', r.name, '/pull/', re.pr_number::text) AS event_url
        FROM raw_events re
        LEFT JOIN repositories r ON r.id = re.repository_id
        LEFT JOIN pull_requests pr ON pr.pr_number = re.pr_number AND pr.repository_id = re.repository_id
        WHERE ($1::text IS NULL OR re.occurred_at >= $1::timestamp)
          AND ($2::text IS NULL OR re.occurred_at <= $2::timestamp)
          AND ($3::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($3))
        ORDER BY re.occurred_at DESC
        LIMIT $4
      `,
        input.from ?? null,
        input.to ?? null,
        input.repo ?? null,
        input.limit ?? 500,
        Array.from(CANONICAL_EIP_EDITORS),
        CANONICAL_EIP_EDITOR_LOWER
      );

      return rows.map((r) => ({
        actor: r.actor,
        eventType: r.event_type,
        actedAt: r.acted_at,
        prNumber: r.pr_number,
        repoShort: r.repo_short ?? 'unknown',
        title: r.title ?? '',
        eventUrl: r.event_url,
      }));
    }),

  getReviewerDailyActivityStacked: optionalAuthProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        date: string;
        actor: string;
        count: bigint;
      }>>(
        `
        WITH reviewer_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($4::text[], $5::text[]) AS x(canonical, actor_lc)
        ),
        raw_events AS (
          SELECT
            rm.canonical AS actor,
            ca.repository_id,
            ca.occurred_at
          FROM contributor_activity ca
          JOIN reviewer_map rm ON LOWER(ca.actor) = rm.actor_lc
          WHERE ca.pr_number > 0
        )
        SELECT
          TO_CHAR(date_trunc('day', re.occurred_at), 'YYYY-MM-DD') AS date,
          re.actor,
          COUNT(*)::bigint AS count
        FROM raw_events re
        LEFT JOIN repositories r ON r.id = re.repository_id
        WHERE ($1::text IS NULL OR re.occurred_at >= $1::timestamp)
          AND ($2::text IS NULL OR re.occurred_at <= $2::timestamp)
          AND ($3::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($3))
        GROUP BY date_trunc('day', re.occurred_at), re.actor
        ORDER BY date ASC, re.actor ASC
      `,
        input.from ?? null,
        input.to ?? null,
        input.repo ?? null,
        Array.from(CANONICAL_EIP_REVIEWERS),
        CANONICAL_EIP_REVIEWER_LOWER
      );

      return results.map((r) => ({
        date: r.date,
        actor: r.actor,
        count: Number(r.count),
      }));
    }),

  getReviewerActionDetails: optionalAuthProcedure
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      limit: z.number().optional().default(500),
    }))
    .handler(async ({ input }) => {
      const rows = await prisma.$queryRawUnsafe<Array<{
        actor: string;
        event_type: string;
        acted_at: string;
        pr_number: number;
        repo_short: string | null;
        title: string | null;
        event_url: string | null;
      }>>(
        `
        WITH reviewer_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($5::text[], $6::text[]) AS x(canonical, actor_lc)
        ),
        raw_events AS (
          SELECT
            rm.canonical AS actor,
            ca.action_type AS event_type,
            ca.pr_number,
            ca.repository_id,
            ca.occurred_at
          FROM contributor_activity ca
          JOIN reviewer_map rm ON LOWER(ca.actor) = rm.actor_lc
          WHERE ca.pr_number > 0
        )
        SELECT
          re.actor,
          re.event_type,
          TO_CHAR(re.occurred_at, 'YYYY-MM-DD HH24:MI:SS') AS acted_at,
          re.pr_number,
          LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short,
          pr.title,
          CONCAT('https://github.com/', r.name, '/pull/', re.pr_number::text) AS event_url
        FROM raw_events re
        LEFT JOIN repositories r ON r.id = re.repository_id
        LEFT JOIN pull_requests pr ON pr.pr_number = re.pr_number AND pr.repository_id = re.repository_id
        WHERE ($1::text IS NULL OR re.occurred_at >= $1::timestamp)
          AND ($2::text IS NULL OR re.occurred_at <= $2::timestamp)
          AND ($3::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($3))
        ORDER BY re.occurred_at DESC
        LIMIT $4
      `,
        input.from ?? null,
        input.to ?? null,
        input.repo ?? null,
        input.limit ?? 500,
        Array.from(CANONICAL_EIP_REVIEWERS),
        CANONICAL_EIP_REVIEWER_LOWER
      );

      return rows.map((r) => ({
        actor: r.actor,
        eventType: r.event_type,
        actedAt: r.acted_at,
        prNumber: r.pr_number,
        repoShort: r.repo_short ?? 'unknown',
        title: r.title ?? '',
        eventUrl: r.event_url,
      }));
    }),

  // ——— Authors Analytics ———
  getAuthorKPIs: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      const periodStart = input.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [prStats, eipStats] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{
          total_authors: bigint;
          new_authors: bigint;
          repeat_authors: bigint;
          prs_created: bigint;
          authors_with_merged: bigint;
        }>>(
          `
          WITH scoped_prs AS (
            SELECT pr.author, pr.created_at, pr.merged_at
            FROM pull_requests pr
            JOIN repositories r ON pr.repository_id = r.id
            WHERE pr.author IS NOT NULL
              AND LOWER(pr.author) NOT LIKE '%bot%'
              AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
              AND ($2::text IS NULL OR pr.created_at >= $2::timestamp)
              AND ($3::text IS NULL OR pr.created_at <= $3::timestamp)
          ),
          author_first_seen AS (
            SELECT pr.author, MIN(pr.created_at) AS first_created_at
            FROM pull_requests pr
            JOIN repositories r ON pr.repository_id = r.id
            WHERE pr.author IS NOT NULL
              AND LOWER(pr.author) NOT LIKE '%bot%'
              AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            GROUP BY pr.author
          ),
          scoped_authors AS (
            SELECT DISTINCT author FROM scoped_prs
          )
          SELECT
            (SELECT COUNT(*)::bigint FROM scoped_authors) as total_authors,
            (SELECT COUNT(*)::bigint
             FROM scoped_authors sa
             JOIN author_first_seen afs ON afs.author = sa.author
             WHERE afs.first_created_at >= $4::timestamp) as new_authors,
            (SELECT COUNT(*)::bigint
             FROM scoped_authors sa
             JOIN author_first_seen afs ON afs.author = sa.author
             WHERE afs.first_created_at < $4::timestamp) as repeat_authors,
            (SELECT COUNT(*)::bigint FROM scoped_prs) as prs_created,
            (SELECT COUNT(DISTINCT author)::bigint FROM scoped_prs WHERE merged_at IS NOT NULL) as authors_with_merged
        `,
          input.repo ?? null,
          input.from ?? null,
          input.to ?? null,
          periodStart
        ),
        prisma.$queryRawUnsafe<Array<{
          eips_authored: bigint;
        }>>(
          `
          SELECT COUNT(DISTINCT e.author)::bigint as eips_authored
          FROM eips e
          JOIN eip_snapshots s ON s.eip_id = e.id
          LEFT JOIN repositories r ON s.repository_id = r.id
          WHERE e.author IS NOT NULL
            AND LOWER(e.author) NOT LIKE '%bot%'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        `,
          input.repo ?? null
        ),
      ]);

      const prRow = prStats[0] || {
        total_authors: BigInt(0),
        new_authors: BigInt(0),
        repeat_authors: BigInt(0),
        prs_created: BigInt(0),
        authors_with_merged: BigInt(0),
      };
      const eipRow = eipStats[0] || {
        eips_authored: BigInt(0),
      };

      return {
        totalAuthors: Number(prRow.total_authors),
        newAuthors: Number(prRow.new_authors),
        repeatAuthors: Number(prRow.repeat_authors),
        prsCreated: Number(prRow.prs_created),
        proposalsAuthored: Number(prRow.prs_created),
        authorsWithMerged: Number(prRow.authors_with_merged),
        eipsAuthored: Number(eipRow.eips_authored),
      };
    }),

  getAuthorCohortTimeline: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      months: z.number().optional().default(12),
    }))
    .handler(async ({ input }) => {
      const rows = await prisma.$queryRawUnsafe<Array<{
        month: string;
        active_authors: bigint;
        new_authors: bigint;
        returning_authors: bigint;
        proposals_authored: bigint;
      }>>(
        `
        WITH author_first_month AS (
          SELECT
            pr.author,
            date_trunc('month', MIN(pr.created_at)) AS first_month
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.author IS NOT NULL
            AND LOWER(pr.author) NOT LIKE '%bot%'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          GROUP BY pr.author
        ),
        monthly_author_activity AS (
          SELECT
            date_trunc('month', pr.created_at) AS month_bucket,
            pr.author,
            COUNT(*)::bigint AS proposals
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.author IS NOT NULL
            AND LOWER(pr.author) NOT LIKE '%bot%'
            AND ($2::text IS NULL OR pr.created_at >= $2::timestamp)
            AND ($3::text IS NULL OR pr.created_at <= $3::timestamp)
            AND (
              ($2::text IS NOT NULL OR $3::text IS NOT NULL)
              OR $4::int IS NULL
              OR pr.created_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $4)
            )
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          GROUP BY date_trunc('month', pr.created_at), pr.author
        )
        SELECT
          TO_CHAR(maa.month_bucket, 'YYYY-MM') AS month,
          COUNT(DISTINCT maa.author)::bigint AS active_authors,
          COUNT(DISTINCT maa.author) FILTER (WHERE afm.first_month = maa.month_bucket)::bigint AS new_authors,
          (COUNT(DISTINCT maa.author) - COUNT(DISTINCT maa.author) FILTER (WHERE afm.first_month = maa.month_bucket))::bigint AS returning_authors,
          SUM(maa.proposals)::bigint AS proposals_authored
        FROM monthly_author_activity maa
        JOIN author_first_month afm ON afm.author = maa.author
        GROUP BY maa.month_bucket
        ORDER BY month ASC
      `,
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null,
        input.months != null ? (input.months || 12) - 1 : null
      );

      return rows.map((r) => ({
        month: r.month,
        activeAuthors: Number(r.active_authors),
        newAuthors: Number(r.new_authors),
        returningAuthors: Number(r.returning_authors),
        proposalsAuthored: Number(r.proposals_authored),
      }));
    }),

  getAuthorRepoComposition: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      const rows = await prisma.$queryRawUnsafe<Array<{
        repo: string;
        unique_authors: bigint;
        repeat_authors: bigint;
        proposals: bigint;
      }>>(
        `
        WITH base AS (
          SELECT
            pr.author,
            LOWER(SPLIT_PART(r.name, '/', 2)) AS repo
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.author IS NOT NULL
            AND LOWER(pr.author) NOT LIKE '%bot%'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            AND ($2::text IS NULL OR pr.created_at >= $2::timestamp)
            AND ($3::text IS NULL OR pr.created_at <= $3::timestamp)
        ),
        author_totals AS (
          SELECT author, COUNT(*) AS authored_count
          FROM base
          GROUP BY author
        )
        SELECT
          b.repo,
          COUNT(DISTINCT b.author)::bigint AS unique_authors,
          COUNT(DISTINCT b.author) FILTER (WHERE at.authored_count > 1)::bigint AS repeat_authors,
          COUNT(*)::bigint AS proposals
        FROM base b
        JOIN author_totals at ON at.author = b.author
        GROUP BY b.repo
        ORDER BY proposals DESC
      `,
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null
      );

      return rows.map((r) => ({
        repo: r.repo,
        uniqueAuthors: Number(r.unique_authors),
        repeatAuthors: Number(r.repeat_authors),
        proposals: Number(r.proposals),
      }));
    }),

  getAuthorActivityTimeline: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      months: z.number().optional().default(12),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        active_authors: bigint;
      }>>(
        `
        SELECT
          TO_CHAR(date_trunc('month', pr.created_at), 'YYYY-MM') as month,
          COUNT(DISTINCT pr.author)::bigint as active_authors
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        WHERE pr.author IS NOT NULL
          AND pr.created_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $2)
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY date_trunc('month', pr.created_at)
        ORDER BY month ASC
      `,
        input.repo ?? null,
        (input.months || 12) - 1
      );

      return results.map(r => ({
        month: r.month,
        activeAuthors: Number(r.active_authors),
      }));
    }),

  getAuthorSuccessRates: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      limit: z.number().optional().default(20),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        author: string;
        total_prs: bigint;
        merged: bigint;
        closed: bigint;
        open: bigint;
        avg_time_to_merge: number | null;
      }>>(
        `
        WITH author_prs AS (
          SELECT 
            pr.author,
            pr.pr_number,
            pr.repository_id,
            CASE 
              WHEN pr.merged_at IS NOT NULL THEN 'merged'
              WHEN pr.state = 'closed' THEN 'closed'
              ELSE 'open'
            END as status,
            EXTRACT(DAY FROM (pr.merged_at - pr.created_at))::int as days_to_merge
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.author IS NOT NULL
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        )
        SELECT
          author,
          COUNT(*)::bigint as total_prs,
          COUNT(*) FILTER (WHERE status = 'merged')::bigint as merged,
          COUNT(*) FILTER (WHERE status = 'closed')::bigint as closed,
          COUNT(*) FILTER (WHERE status = 'open')::bigint as open,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_merge) FILTER (WHERE status = 'merged')::numeric as avg_time_to_merge
        FROM author_prs
        GROUP BY author
        HAVING COUNT(*) >= 3
        ORDER BY total_prs DESC
        LIMIT $2
      `,
        input.repo ?? null,
        input.limit
      );

      return results.map(r => ({
        author: r.author,
        totalPRs: Number(r.total_prs),
        merged: Number(r.merged),
        closed: Number(r.closed),
        open: Number(r.open),
        mergedPct: r.total_prs > 0 ? Math.round((Number(r.merged) / Number(r.total_prs)) * 100) : 0,
        closedPct: r.total_prs > 0 ? Math.round((Number(r.closed) / Number(r.total_prs)) * 100) : 0,
        openPct: r.total_prs > 0 ? Math.round((Number(r.open) / Number(r.total_prs)) * 100) : 0,
        avgTimeToMerge: r.avg_time_to_merge != null ? Math.round(Number(r.avg_time_to_merge)) : null,
      }));
    }),

  getTopAuthors: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        author: string;
        prs_created: bigint;
        prs_merged: bigint;
        prs_open: bigint;
        prs_closed: bigint;
        avg_time_to_merge: number | null;
        first_seen: string | null;
        last_activity: string | null;
        top_repo: string | null;
      }>>(
        `
        WITH author_stats AS (
          SELECT 
            pr.author,
            COUNT(*)::bigint as prs_created,
            COUNT(*) FILTER (WHERE pr.merged_at IS NOT NULL)::bigint as prs_merged,
            COUNT(*) FILTER (WHERE pr.merged_at IS NULL AND pr.state = 'open')::bigint as prs_open,
            COUNT(*) FILTER (WHERE pr.merged_at IS NULL AND pr.state = 'closed')::bigint as prs_closed,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (pr.merged_at - pr.created_at))) FILTER (WHERE pr.merged_at IS NOT NULL)::numeric as avg_time_to_merge,
            MIN(pr.created_at)::text as first_seen,
            MAX(pr.updated_at)::text as last_activity
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.author IS NOT NULL
            AND LOWER(pr.author) NOT LIKE '%bot%'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            AND ($2::text IS NULL OR pr.created_at >= $2::timestamp)
            AND ($3::text IS NULL OR pr.created_at <= $3::timestamp)
          GROUP BY pr.author
        ),
        author_repo_rank AS (
          SELECT
            pr.author,
            LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short,
            COUNT(*)::bigint AS cnt,
            ROW_NUMBER() OVER (PARTITION BY pr.author ORDER BY COUNT(*) DESC, LOWER(SPLIT_PART(r.name, '/', 2)) ASC) AS rn
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.author IS NOT NULL
            AND LOWER(pr.author) NOT LIKE '%bot%'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            AND ($2::text IS NULL OR pr.created_at >= $2::timestamp)
            AND ($3::text IS NULL OR pr.created_at <= $3::timestamp)
          GROUP BY pr.author, LOWER(SPLIT_PART(r.name, '/', 2))
        )
        SELECT a.*, rr.repo_short AS top_repo
        FROM author_stats a
        LEFT JOIN author_repo_rank rr ON rr.author = a.author AND rr.rn = 1
        ORDER BY a.prs_created DESC
        LIMIT $4
      `,
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null,
        input.limit
      );

      return results.map(r => ({
        author: r.author,
        prsCreated: Number(r.prs_created),
        prsMerged: Number(r.prs_merged),
        prsOpen: Number(r.prs_open),
        prsClosed: Number(r.prs_closed),
        avgTimeToMerge: r.avg_time_to_merge != null ? Math.round(Number(r.avg_time_to_merge)) : null,
        firstSeen: r.first_seen,
        lastActivity: r.last_activity,
        topRepo: r.top_repo,
      }));
    }),

  // ——— Editors & Reviewers Analytics (cached) ———
  getEditorsLeaderboard: optionalAuthProcedure
    .input(z.object({
      limit: z.number().optional().default(30),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      return getEditorsLeaderboardCached(
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null,
        input.limit
      );
    }),

  getEditorsLeaderboardExport: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      actor: z.string().optional(),
      detailsOnly: z.boolean().optional(),
    }))
    .handler(async ({ context, input }) => {
      await requireTier(context, 'pro');

      const [summary, details] = await Promise.all([
        getEditorsLeaderboardCached(input.repo ?? null, input.from ?? null, input.to ?? null, 500),
        prisma.$queryRawUnsafe<Array<{
          actor: string;
          pr_number: number;
          repo_name: string | null;
          occurred_at: string;
          action_type: string;
        }>>(
          `
          WITH editor_map AS (
            SELECT canonical, actor_lc
            FROM UNNEST($4::text[], $5::text[]) AS x(canonical, actor_lc)
          ),
          raw_events AS (
            SELECT
              em.canonical AS actor,
              pe.pr_number,
              pe.repository_id,
              pe.event_type AS action_type,
              CASE
                WHEN pe.created_at > COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at) + INTERVAL '30 days'
                  THEN COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at)
                ELSE pe.created_at
              END AS occurred_at
            FROM pr_events pe
            JOIN editor_map em ON LOWER(pe.actor) = em.actor_lc
            LEFT JOIN pull_requests pr ON pr.pr_number = pe.pr_number AND pr.repository_id = pe.repository_id
            WHERE pe.pr_number > 0
              AND pe.created_at <= NOW()
              AND pe.event_type NOT IN ('subscribed', 'mentioned', 'referenced')
          )
          SELECT re.actor, re.pr_number, r.name AS repo_name,
                 TO_CHAR(re.occurred_at, 'YYYY-MM-DD HH24:MI:SS') AS occurred_at,
                 re.action_type
          FROM raw_events re
          LEFT JOIN repositories r ON r.id = re.repository_id
          WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            AND ($2::text IS NULL OR re.occurred_at >= $2::timestamp)
            AND ($3::text IS NULL OR re.occurred_at <= $3::timestamp)
            AND ($6::text IS NULL OR LOWER(re.actor) = LOWER($6))
          ORDER BY re.actor, re.occurred_at ASC
          LIMIT 10000
          `,
          input.repo ?? null,
          input.from ?? null,
          input.to ?? null,
          Array.from(CANONICAL_EIP_EDITORS),
          CANONICAL_EIP_EDITOR_LOWER,
          input.actor ?? null
        ),
      ]);

      const filteredSummary = input.actor
        ? summary.filter((row) => row.actor.toLowerCase() === input.actor!.toLowerCase())
        : summary;

      const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

      const summaryRows = [
        'Rank,Editor,Total Actions,Reviews,Comments,PRs Touched,Median Response (days)',
        ...filteredSummary.map((r, i) =>
          [i + 1, r.actor, r.totalActions, r.reviews, r.comments, r.prsTouched, r.medianResponseDays ?? ''].map(escape).join(',')
        ),
      ];

      const detailRows = [
        '',
        'Editor,PR Number,Repository,Occurred At,Action Type,PR Link',
        ...details.map((r) =>
          [
            r.actor,
            r.pr_number,
            r.repo_name ?? '',
            r.occurred_at,
            r.action_type,
            r.repo_name ? `https://github.com/${r.repo_name}/pull/${r.pr_number}` : '',
          ].map(escape).join(',')
        ),
      ];

      const csv = input.detailsOnly
        ? ['Editor,PR Number,Repository,Occurred At,Action Type,PR Link', ...details.map((r) =>
            [
              r.actor,
              r.pr_number,
              r.repo_name ?? '',
              r.occurred_at,
              r.action_type,
              r.repo_name ? `https://github.com/${r.repo_name}/pull/${r.pr_number}` : '',
            ].map(escape).join(',')
          )].join('\n')
        : [...summaryRows, ...detailRows].join('\n');
      const monthLabel = input.from
        ? `${input.from.slice(0, 7)}`
        : new Date().toISOString().slice(0, 7);
      const actorSuffix = input.actor ? `-${input.actor.toLowerCase()}` : '';
      const filename = `editors-leaderboard${actorSuffix}-${monthLabel}.csv`;

      return { csv, filename };
    }),

  getReviewersLeaderboard: optionalAuthProcedure
    .input(z.object({
      limit: z.number().optional().default(30),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      return getReviewersLeaderboardCached(
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null,
        input.limit
      );
    }),

  getEditorsByCategory: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      return getEditorsByCategoryCached(
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null
      );
    }),

  getEditorsRepoDistribution: optionalAuthProcedure
    .input(z.object({
      actor: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      return getEditorsRepoDistributionCached(
        input.actor ?? null,
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null
      );
    }),

  getReviewersRepoDistribution: optionalAuthProcedure
    .input(z.object({
      actor: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      return getReviewersRepoDistributionCached(
        input.actor ?? null,
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null
      );
    }),

  getEditorsMonthlyTrend: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      months: z.number().optional().default(12),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        actor: string;
        count: bigint;
      }>>(
        `
        WITH editor_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($5::text[], $6::text[]) AS x(canonical, actor_lc)
        ),
        raw_events AS (
          SELECT
            em.canonical AS actor,
            pe.pr_number,
            pe.repository_id,
            pe.event_type,
            CASE
              WHEN pe.created_at > COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at) + INTERVAL '30 days'
                THEN COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at)
              ELSE pe.created_at
            END AS occurred_at
          FROM pr_events pe
          JOIN editor_map em ON LOWER(pe.actor) = em.actor_lc
          LEFT JOIN pull_requests pr ON pr.pr_number = pe.pr_number AND pr.repository_id = pe.repository_id
          WHERE pe.pr_number > 0
            AND pe.created_at <= NOW()
            AND pe.event_type NOT IN ('subscribed', 'mentioned', 'referenced')
        ),
        deduped_events AS (
          SELECT
            actor,
            pr_number,
            repository_id,
            event_type,
            date_trunc('second', occurred_at) AS occurred_at
          FROM raw_events
          GROUP BY actor, pr_number, repository_id, event_type, date_trunc('second', occurred_at)
        )
        SELECT
          TO_CHAR(date_trunc('month', de.occurred_at), 'YYYY-MM') as month,
          de.actor AS actor,
          COUNT(*)::bigint as count
        FROM deduped_events de
        LEFT JOIN repositories r ON r.id = de.repository_id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND ($2::text IS NULL OR de.occurred_at >= $2::timestamp)
          AND ($3::text IS NULL OR de.occurred_at < (($3::date + INTERVAL '1 day')::timestamp))
          AND (
            ($2::text IS NOT NULL OR $3::text IS NOT NULL)
            OR de.occurred_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $4)
          )
        GROUP BY date_trunc('month', de.occurred_at), de.actor
        ORDER BY month ASC, count DESC
      `,
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null,
        (input.months || 12) - 1,
        Array.from(CANONICAL_EIP_EDITORS),
        CANONICAL_EIP_EDITOR_LOWER
      );
      
      // Group by month and aggregate top editors
      const byMonth: Record<string, Record<string, number>> = {};
      results.forEach(r => {
        if (!byMonth[r.month]) byMonth[r.month] = {};
        byMonth[r.month][r.actor] = Number(r.count);
      });
      
      // Get top editors across all months
      const editorTotals: Record<string, number> = {};
      results.forEach(r => {
        editorTotals[r.actor] = (editorTotals[r.actor] || 0) + Number(r.count);
      });
      const topEditors = Object.entries(editorTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([actor]) => actor);
      
      return Object.entries(byMonth).map(([month, actors]) => ({
        month,
        ...Object.fromEntries(topEditors.map(actor => [actor, actors[actor] || 0])),
      }));
    }),

  getEditorsMonthlyReviewedPRs: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      months: z.number().optional().default(12),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        actor: string;
        count: bigint;
      }>>(
        `
        WITH editor_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($5::text[], $6::text[]) AS x(canonical, actor_lc)
        ),
        raw_reviews AS (
          SELECT
            em.canonical AS actor,
            pe.pr_number,
            pe.repository_id,
            pe.event_type,
            CASE
              WHEN pe.created_at > COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at) + INTERVAL '30 days'
                THEN COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at)
              ELSE pe.created_at
            END AS occurred_at
          FROM pr_events pe
          JOIN editor_map em ON LOWER(pe.actor) = em.actor_lc
          LEFT JOIN pull_requests pr ON pr.pr_number = pe.pr_number AND pr.repository_id = pe.repository_id
          WHERE pe.pr_number > 0
            AND pe.created_at <= NOW()
            AND pe.event_type IN ('reviewed', 'approved', 'changes_requested')
        ),
        deduped_reviews AS (
          SELECT
            actor,
            pr_number,
            repository_id,
            event_type,
            date_trunc('second', occurred_at) AS occurred_at
          FROM raw_reviews
          GROUP BY actor, pr_number, repository_id, event_type, date_trunc('second', occurred_at)
        )
        SELECT
          TO_CHAR(date_trunc('month', dr.occurred_at), 'YYYY-MM') as month,
          dr.actor,
          COUNT(DISTINCT CONCAT(dr.repository_id::text, ':', dr.pr_number::text))::bigint as count
        FROM deduped_reviews dr
        LEFT JOIN repositories r ON r.id = dr.repository_id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND ($2::text IS NULL OR dr.occurred_at >= $2::timestamp)
          AND ($3::text IS NULL OR dr.occurred_at < (($3::date + INTERVAL '1 day')::timestamp))
          AND (
            ($2::text IS NOT NULL OR $3::text IS NOT NULL)
            OR dr.occurred_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $4)
          )
        GROUP BY date_trunc('month', dr.occurred_at), dr.actor
        ORDER BY month ASC, count DESC
      `,
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null,
        (input.months || 12) - 1,
        Array.from(CANONICAL_EIP_EDITORS),
        CANONICAL_EIP_EDITOR_LOWER
      );

      const byMonth: Record<string, Record<string, number>> = {};
      results.forEach((r) => {
        if (!byMonth[r.month]) byMonth[r.month] = {};
        byMonth[r.month][r.actor] = Number(r.count);
      });

      const totals: Record<string, number> = {};
      results.forEach((r) => {
        totals[r.actor] = (totals[r.actor] || 0) + Number(r.count);
      });
      const topActors = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([actor]) => actor);

      return Object.entries(byMonth).map(([month, actors]) => ({
        month,
        ...Object.fromEntries(topActors.map((actor) => [actor, actors[actor] || 0])),
      }));
    }),

  getReviewersMonthlyTrend: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      months: z.number().optional().default(12),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        actor: string;
        count: bigint;
      }>>(
        `
        WITH reviewer_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($3::text[], $4::text[]) AS x(canonical, actor_lc)
        )
        SELECT
          TO_CHAR(date_trunc('month', ca.occurred_at), 'YYYY-MM') as month,
          rm.canonical as actor,
          COUNT(*)::bigint as count
        FROM contributor_activity ca
        JOIN reviewer_map rm ON LOWER(ca.actor) = rm.actor_lc
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE ca.occurred_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $2)
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY date_trunc('month', ca.occurred_at), rm.canonical
        ORDER BY month ASC, count DESC
      `,
        input.repo ?? null,
        (input.months || 12) - 1,
        Array.from(CANONICAL_EIP_REVIEWERS),
        CANONICAL_EIP_REVIEWER_LOWER
      );
      
      // Group by month and aggregate top reviewers
      const byMonth: Record<string, Record<string, number>> = {};
      results.forEach(r => {
        if (!byMonth[r.month]) byMonth[r.month] = {};
        byMonth[r.month][r.actor] = Number(r.count);
      });
      
      // Get top reviewers across all months
      const reviewerTotals: Record<string, number> = {};
      results.forEach(r => {
        reviewerTotals[r.actor] = (reviewerTotals[r.actor] || 0) + Number(r.count);
      });
      const topReviewers = Object.entries(reviewerTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([actor]) => actor);
      
      return Object.entries(byMonth).map(([month, actors]) => ({
        month,
        ...Object.fromEntries(topReviewers.map(actor => [actor, actors[actor] || 0])),
      }));
    }),

  getReviewersMonthlyReviewedPRs: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      months: z.number().optional().default(12),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        actor: string;
        count: bigint;
      }>>(
        `
        WITH reviewer_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($3::text[], $4::text[]) AS x(canonical, actor_lc)
        ),
        raw_reviews AS (
          SELECT
            rm.canonical AS actor,
            ca.pr_number,
            ca.repository_id,
            ca.occurred_at
          FROM contributor_activity ca
          JOIN reviewer_map rm ON LOWER(ca.actor) = rm.actor_lc
          WHERE ca.pr_number > 0
            AND ca.action_type = 'reviewed'
        )
        SELECT
          TO_CHAR(date_trunc('month', rr.occurred_at), 'YYYY-MM') as month,
          rr.actor,
          COUNT(DISTINCT rr.pr_number)::bigint as count
        FROM raw_reviews rr
        LEFT JOIN repositories r ON r.id = rr.repository_id
        WHERE rr.occurred_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $2)
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY date_trunc('month', rr.occurred_at), rr.actor
        ORDER BY month ASC, count DESC
      `,
        input.repo ?? null,
        (input.months || 12) - 1,
        Array.from(CANONICAL_EIP_REVIEWERS),
        CANONICAL_EIP_REVIEWER_LOWER
      );

      const byMonth: Record<string, Record<string, number>> = {};
      results.forEach((r) => {
        if (!byMonth[r.month]) byMonth[r.month] = {};
        byMonth[r.month][r.actor] = Number(r.count);
      });

      const totals: Record<string, number> = {};
      results.forEach((r) => {
        totals[r.actor] = (totals[r.actor] || 0) + Number(r.count);
      });
      const topActors = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([actor]) => actor);

      return Object.entries(byMonth).map(([month, actors]) => ({
        month,
        ...Object.fromEntries(topActors.map((actor) => [actor, actors[actor] || 0])),
      }));
    }),

  getReviewerCyclesPerPR: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{
        cycles: number;
        count: bigint;
      }>>(
        `
        WITH reviewer_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($2::text[], $3::text[]) AS x(canonical, actor_lc)
        ),
        pr_review_counts AS (
          SELECT 
            ca.pr_number,
            ca.repository_id,
            COUNT(DISTINCT rm.canonical) FILTER (WHERE ca.action_type = 'reviewed') as review_cycles
          FROM contributor_activity ca
          JOIN reviewer_map rm ON LOWER(ca.actor) = rm.actor_lc
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          GROUP BY ca.pr_number, ca.repository_id
        )
        SELECT 
          review_cycles::int as cycles,
          COUNT(*)::bigint as count
        FROM pr_review_counts
        WHERE review_cycles > 0
        GROUP BY review_cycles
        ORDER BY cycles ASC
      `,
        input.repo ?? null,
        Array.from(CANONICAL_EIP_REVIEWERS),
        CANONICAL_EIP_REVIEWER_LOWER
      );
      
      return results.map(r => ({
        cycles: r.cycles,
        count: Number(r.count),
      }));
    }),

  getMonthlyReviewTrend: optionalAuthProcedure
    .input(z.object({
      actor: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const results = await prisma.$queryRawUnsafe<Array<{ month: string; count: bigint }>>(
        `
        SELECT TO_CHAR(date_trunc('month', pe.created_at), 'YYYY-MM') AS month, COUNT(*)::bigint AS count
        FROM pr_events pe
        LEFT JOIN repositories r ON r.id = pe.repository_id
        WHERE (pe.actor_role = 'EDITOR' OR pe.event_type = 'reviewed')
          AND ($1::text IS NULL OR pe.actor = $1)
          AND ($2::text IS NULL OR pe.created_at >= $2::timestamp)
          AND ($3::text IS NULL OR pe.created_at <= $3::timestamp)
          AND ($4::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($4))
        GROUP BY date_trunc('month', pe.created_at)
        ORDER BY month ASC
      `,
        input.actor ?? null,
        input.from ?? '2015-01-01',
        input.to ?? null,
        input.repo ?? null
      );
      return results.map((r) => ({ month: r.month, count: Number(r.count) }));
    }),

  // EIP Analytics Procedures
  getEIPStatusTransitions: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      return getEIPStatusTransitionsCached(
        input.repo ?? null,
        input.from || null,
        input.to || null
      );
    }),

  getEIPThroughput: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      months: z.number().optional().default(12),
    }))
    .handler(async ({ input }) => {
      const monthsParam = input.months || 12;
      return getEIPThroughputCached(input.repo ?? null, monthsParam);
    }),

  exportEIPStatusTransitionsDetailedCSV: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      const from = input.from ?? null;
      const to = input.to ?? null;

      const summary = await prisma.$queryRawUnsafe<Array<{
        from_status: string;
        to_status: string;
        count: bigint;
      }>>(
        `
        SELECT
          se.from_status,
          se.to_status,
          COUNT(*)::bigint AS count
        FROM eip_status_events se
        LEFT JOIN repositories r ON r.id = se.repository_id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND ($2::date IS NULL OR se.changed_at >= $2)
          AND ($3::date IS NULL OR se.changed_at <= $3)
          AND se.from_status IS NOT NULL
          AND se.to_status IS NOT NULL
        GROUP BY se.from_status, se.to_status
        ORDER BY count DESC, se.from_status ASC, se.to_status ASC
        `,
        input.repo ?? null,
        from,
        to
      );

      const details = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        title: string | null;
        author: string | null;
        category: string | null;
        repository: string | null;
        from_status: string;
        to_status: string;
        changed_at: Date;
        pr_number: number | null;
      }>>(
        `
        SELECT
          e.eip_number,
          e.title,
          e.author,
          COALESCE(NULLIF(snap.category, ''), NULLIF(snap.type, ''), 'Other') AS category,
          COALESCE(r.name, 'ethereum/EIPs') AS repository,
          se.from_status,
          se.to_status,
          se.changed_at,
          se.pr_number
        FROM eip_status_events se
        JOIN eips e ON e.id = se.eip_id
        LEFT JOIN repositories r ON r.id = se.repository_id
        LEFT JOIN LATERAL (
          SELECT s1.type, s1.category
          FROM eip_snapshots s1
          WHERE s1.eip_id = se.eip_id
            AND (se.repository_id IS NULL OR s1.repository_id = se.repository_id)
          ORDER BY s1.updated_at DESC NULLS LAST
          LIMIT 1
        ) snap ON TRUE
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND ($2::date IS NULL OR se.changed_at >= $2)
          AND ($3::date IS NULL OR se.changed_at <= $3)
          AND se.from_status IS NOT NULL
          AND se.to_status IS NOT NULL
        ORDER BY se.changed_at DESC, e.eip_number DESC
        `,
        input.repo ?? null,
        from,
        to
      );

      const escapeCsv = (value: string | number | null | undefined) =>
        `"${String(value ?? '').replace(/"/g, '""')}"`;

      const totalTransitions = summary.reduce((sum, row) => sum + Number(row.count), 0);
      const summaryHeader = [
        'record_type',
        'repo_filter',
        'from_date',
        'to_date',
        'from_status',
        'to_status',
        'transition_count',
        'share_percent',
        'metric_definition',
      ].join(',');
      const summaryBody = summary.map((row) => {
        const count = Number(row.count);
        const pct = totalTransitions > 0 ? ((count * 100) / totalTransitions).toFixed(2) : '0.00';
        return [
          'summary',
          escapeCsv(input.repo ?? 'all'),
          escapeCsv(from ?? ''),
          escapeCsv(to ?? ''),
          escapeCsv(row.from_status),
          escapeCsv(row.to_status),
          count,
          pct,
          escapeCsv('Number of status transition events matching this from→to pair'),
        ].join(',');
      });

      const detailsHeader = [
        'record_type',
        'repo_filter',
        'proposal_number',
        'title',
        'author',
        'category',
        'repository',
        'from_status',
        'to_status',
        'changed_at_utc',
        'pr_number',
        'metric_definition',
      ].join(',');
      const detailsBody = details.map((row) => [
        'detail',
        escapeCsv(input.repo ?? 'all'),
        row.eip_number,
        escapeCsv(row.title),
        escapeCsv(row.author),
        escapeCsv(row.category),
        escapeCsv(row.repository),
        escapeCsv(row.from_status),
        escapeCsv(row.to_status),
        escapeCsv(row.changed_at.toISOString()),
        row.pr_number ?? '',
        escapeCsv('Event-level row contributing to status transition flow counts'),
      ].join(','));

      const stamp = new Date().toISOString().slice(0, 10);
      return {
        csv: [summaryHeader, ...summaryBody, '', detailsHeader, ...detailsBody].join('\n'),
        filename: `eip-status-transitions-detailed-${stamp}.csv`,
      };
    }),

  exportEIPThroughputDetailedCSV: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      months: z.number().optional().default(12),
    }))
    .handler(async ({ input }) => {
      const monthsParam = Math.max(1, input.months || 12);

      const summary = await prisma.$queryRawUnsafe<Array<{
        month: string;
        status: string;
        count: bigint;
      }>>(
        `
        SELECT
          TO_CHAR(date_trunc('month', se.changed_at), 'YYYY-MM') AS month,
          se.to_status AS status,
          COUNT(*)::bigint AS count
        FROM eip_status_events se
        LEFT JOIN repositories r ON r.id = se.repository_id
        WHERE se.changed_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $2)
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND se.to_status IN ('Draft', 'Review', 'Last Call', 'Final')
        GROUP BY date_trunc('month', se.changed_at), se.to_status
        ORDER BY month ASC, status ASC
        `,
        input.repo ?? null,
        monthsParam - 1
      );

      const details = await prisma.$queryRawUnsafe<Array<{
        month: string;
        eip_number: number;
        title: string | null;
        author: string | null;
        category: string | null;
        repository: string | null;
        to_status: string;
        changed_at: Date;
        pr_number: number | null;
      }>>(
        `
        SELECT
          TO_CHAR(date_trunc('month', se.changed_at), 'YYYY-MM') AS month,
          e.eip_number,
          e.title,
          e.author,
          COALESCE(NULLIF(snap.category, ''), NULLIF(snap.type, ''), 'Other') AS category,
          COALESCE(r.name, 'ethereum/EIPs') AS repository,
          se.to_status,
          se.changed_at,
          se.pr_number
        FROM eip_status_events se
        JOIN eips e ON e.id = se.eip_id
        LEFT JOIN repositories r ON r.id = se.repository_id
        LEFT JOIN LATERAL (
          SELECT s1.type, s1.category
          FROM eip_snapshots s1
          WHERE s1.eip_id = se.eip_id
            AND (se.repository_id IS NULL OR s1.repository_id = se.repository_id)
          ORDER BY s1.updated_at DESC NULLS LAST
          LIMIT 1
        ) snap ON TRUE
        WHERE se.changed_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $2)
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND se.to_status IN ('Draft', 'Review', 'Last Call', 'Final')
        ORDER BY se.changed_at DESC, e.eip_number DESC
        `,
        input.repo ?? null,
        monthsParam - 1
      );

      const escapeCsv = (value: string | number | null | undefined) =>
        `"${String(value ?? '').replace(/"/g, '""')}"`;

      const summaryHeader = [
        'record_type',
        'repo_filter',
        'months_window',
        'month',
        'status',
        'count',
        'metric_definition',
      ].join(',');
      const summaryBody = summary.map((row) => [
        'summary',
        escapeCsv(input.repo ?? 'all'),
        monthsParam,
        escapeCsv(row.month),
        escapeCsv(row.status),
        Number(row.count),
        escapeCsv('Number of status-change events to this status in the given month'),
      ].join(','));

      const detailsHeader = [
        'record_type',
        'repo_filter',
        'months_window',
        'month',
        'proposal_number',
        'title',
        'author',
        'category',
        'repository',
        'to_status',
        'changed_at_utc',
        'pr_number',
        'metric_definition',
      ].join(',');
      const detailsBody = details.map((row) => [
        'detail',
        escapeCsv(input.repo ?? 'all'),
        monthsParam,
        escapeCsv(row.month),
        row.eip_number,
        escapeCsv(row.title),
        escapeCsv(row.author),
        escapeCsv(row.category),
        escapeCsv(row.repository),
        escapeCsv(row.to_status),
        escapeCsv(row.changed_at.toISOString()),
        row.pr_number ?? '',
        escapeCsv('Event-level row contributing to monthly throughput counts'),
      ].join(','));

      const stamp = new Date().toISOString().slice(0, 10);
      return {
        csv: [summaryHeader, ...summaryBody, '', detailsHeader, ...detailsBody].join('\n'),
        filename: `eip-throughput-detailed-${stamp}.csv`,
      };
    }),

  getEIPHeroKPIs: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ input }) => {

      const periodStart =
        input.from ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

      return getEIPHeroKPIsCached(input.repo ?? null, periodStart);
    }),

  // ——— Monthly Editor Leaderboard ———
  // Activity-based metric for official editors in the selected month.
  getMonthlyEditorLeaderboard: optionalAuthProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
      monthYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const now = new Date();
      const baseDate = input.monthYear
        ? new Date(`${input.monthYear}-01T00:00:00.000Z`)
        : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextDate = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, 1));
      const monthStart = `${baseDate.getUTCFullYear()}-${String(baseDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}-01`;

      const allEditors = Array.from(CANONICAL_EIP_EDITORS);
      const repoRows = input.repo
        ? await prisma.$queryRawUnsafe<Array<{ id: number }>>(
            `SELECT id
             FROM repositories
             WHERE LOWER(SPLIT_PART(name, '/', 2)) = LOWER($1)`,
            input.repo
          )
        : [];
      const repoIds = input.repo ? repoRows.map((row) => row.id) : null;

      const results = await prisma.$queryRawUnsafe<Array<{
        actor: string;
        total_actions: bigint;
        prs_touched: bigint;
        eips_actions: bigint;
        ercs_actions: bigint;
        rips_actions: bigint;
        latest_occurred_at: Date | null;
      }>>(
        `
        WITH editor_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($1::text[], $6::text[]) AS x(canonical, actor_lc)
        ),
        raw_events AS (
          SELECT
            em.canonical AS actor,
            pe.pr_number,
            pe.repository_id,
            pe.event_type,
            LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) AS repo_short,
            CASE
              WHEN pe.created_at > COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at) + INTERVAL '30 days'
                THEN COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at)
              ELSE pe.created_at
            END AS occurred_at
          FROM pr_events pe
          JOIN editor_map em ON LOWER(pe.actor) = em.actor_lc
          LEFT JOIN repositories r ON r.id = pe.repository_id
          LEFT JOIN pull_requests pr ON pr.pr_number = pe.pr_number AND pr.repository_id = pe.repository_id
          WHERE pe.pr_number > 0
            AND pe.created_at <= NOW()
            AND pe.event_type NOT IN ('subscribed', 'mentioned', 'referenced')
        ),
        deduped_events AS (
          SELECT
            actor,
            pr_number,
            repository_id,
            event_type,
            repo_short,
            date_trunc('second', occurred_at) AS occurred_at
          FROM raw_events
          GROUP BY actor, pr_number, repository_id, event_type, repo_short, date_trunc('second', occurred_at)
        )
        SELECT
          de.actor AS actor,
          COUNT(*)::bigint AS total_actions,
          COUNT(DISTINCT CONCAT(de.repository_id::text, ':', de.pr_number::text))::bigint AS prs_touched,
          COUNT(*) FILTER (WHERE de.repo_short = 'eips')::bigint AS eips_actions,
          COUNT(*) FILTER (WHERE de.repo_short = 'ercs')::bigint AS ercs_actions,
          COUNT(*) FILTER (WHERE de.repo_short = 'rips')::bigint AS rips_actions,
          MAX(de.occurred_at) AS latest_occurred_at
        FROM deduped_events de
        WHERE de.occurred_at >= $2::date
          AND de.occurred_at < $3::date
          AND ($5::int[] IS NULL OR de.repository_id = ANY($5))
        GROUP BY de.actor
        ORDER BY total_actions DESC, prs_touched DESC, de.actor ASC
        LIMIT $4
        `,
        allEditors, monthStart, nextMonth, input.limit, repoIds, CANONICAL_EIP_EDITOR_LOWER
      );

      const items = results.map((r) => ({
        actor: r.actor,
        totalActions: Number(r.total_actions),
        prsTouched: Number(r.prs_touched),
        eipsActions: Number(r.eips_actions),
        ercsActions: Number(r.ercs_actions),
        ripsActions: Number(r.rips_actions),
      }));
      const updatedAt = results.reduce<Date | null>((latest, row) => {
        if (!row.latest_occurred_at) return latest;
        if (!latest || row.latest_occurred_at > latest) return row.latest_occurred_at;
        return latest;
      }, null);

      return {
        items,
        updatedAt: updatedAt?.toISOString() ?? null,
      };
    }),

  // ——— Monthly Editor Leaderboard Detailed CSV ———
  // Exports per-action rows for leaderboard editors with PR/review/action metadata.
  exportMonthlyEditorLeaderboardDetailedCSV: optionalAuthProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
      monthYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      actor: z.string().optional(),
    }))
    .handler(async ({ input }) => {
      const now = new Date();
      const baseDate = input.monthYear
        ? new Date(`${input.monthYear}-01T00:00:00.000Z`)
        : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextDate = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth() + 1, 1));
      const monthYear = `${baseDate.getUTCFullYear()}-${String(baseDate.getUTCMonth() + 1).padStart(2, '0')}`;
      const monthStart = `${monthYear}-01`;
      const nextMonth = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}-01`;

      const allEditors = Array.from(CANONICAL_EIP_EDITORS);
      const repoRows = input.repo
        ? await prisma.$queryRawUnsafe<Array<{ id: number }>>(
            `SELECT id
             FROM repositories
             WHERE LOWER(SPLIT_PART(name, '/', 2)) = LOWER($1)`,
            input.repo
          )
        : [];
      const repoIds = input.repo ? repoRows.map((row) => row.id) : null;

      const rows = await prisma.$queryRawUnsafe<Array<{
        editor: string;
        rank: number;
        total_actions: bigint;
        prs_touched: bigint;
        repo: string | null;
        pr_number: number;
        pr_title: string | null;
        action_type: string;
        occurred_at: Date;
        event_type: string | null;
        review_state: string | null;
        governance_state: string | null;
      }>>(
        `
        WITH editor_map AS (
          SELECT canonical, actor_lc
          FROM UNNEST($1::text[], $6::text[]) AS x(canonical, actor_lc)
        ),
        raw_events AS (
          SELECT
            em.canonical AS editor,
            pe.repository_id,
            pe.pr_number,
            pe.event_type,
            pe.metadata,
            CASE
              WHEN pe.created_at > COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at) + INTERVAL '30 days'
                THEN COALESCE(pr.updated_at, pr.closed_at, pr.merged_at, pr.created_at, pe.created_at)
              ELSE pe.created_at
            END AS occurred_at
          FROM pr_events pe
          JOIN editor_map em ON LOWER(pe.actor) = em.actor_lc
          LEFT JOIN pull_requests pr ON pr.pr_number = pe.pr_number AND pr.repository_id = pe.repository_id
          WHERE pe.pr_number > 0
            AND pe.created_at <= NOW()
            AND pe.event_type NOT IN ('subscribed', 'mentioned', 'referenced')
        ),
        leaders AS (
          SELECT
            re.editor,
            COUNT(*)::bigint AS total_actions,
            COUNT(DISTINCT re.pr_number)::bigint AS prs_touched
          FROM raw_events re
          WHERE re.occurred_at >= $2::date
            AND re.occurred_at < $3::date
            AND ($5::int[] IS NULL OR re.repository_id = ANY($5))
            AND ($7::text IS NULL OR LOWER(re.editor) = LOWER($7))
          GROUP BY re.editor
          ORDER BY total_actions DESC, prs_touched DESC, re.editor ASC
          LIMIT $4
        ),
        ranked AS (
          SELECT
            editor,
            total_actions,
            prs_touched,
            ROW_NUMBER() OVER (ORDER BY total_actions DESC, prs_touched DESC, editor ASC) AS rank
          FROM leaders
        ),
        actions AS (
          SELECT
            r.editor,
            r.rank,
            r.total_actions,
            r.prs_touched,
            repo.name AS repo,
            re.pr_number,
            pr.title AS pr_title,
            re.event_type AS action_type,
            re.occurred_at,
            gs.current_state AS governance_state,
            re.event_type,
            re.metadata->>'review_state' AS review_state
          FROM ranked r
          JOIN raw_events re
            ON LOWER(re.editor) = LOWER(r.editor)
          LEFT JOIN repositories repo
            ON repo.id = re.repository_id
          LEFT JOIN pull_requests pr
            ON pr.pr_number = re.pr_number
           AND pr.repository_id = re.repository_id
          LEFT JOIN pr_governance_state gs
            ON gs.pr_number = re.pr_number
           AND gs.repository_id = re.repository_id
          WHERE re.occurred_at >= $2::date
            AND re.occurred_at < $3::date
            AND ($5::int[] IS NULL OR re.repository_id = ANY($5))
        )
        SELECT
          editor,
          rank,
          total_actions,
          prs_touched,
          repo,
          pr_number,
          pr_title,
          action_type,
          occurred_at,
          event_type,
          review_state,
          governance_state
        FROM actions
        ORDER BY rank ASC, editor ASC, occurred_at DESC
        `,
        allEditors,
        monthStart,
        nextMonth,
        input.limit,
        repoIds,
        CANONICAL_EIP_EDITOR_LOWER,
        input.actor ?? null
      );

      const escapeCsv = (value: string | number | null | undefined) =>
        `"${String(value ?? '').replace(/"/g, '""')}"`;

      const header = [
        'month',
        'rank',
        'editor',
        'total_actions_in_month',
        'prs_touched_in_month',
        'repo',
        'pr_number',
        'pr_title',
        'action_type',
        'event_type',
        'review_state',
        'governance_state',
        'occurred_at_utc',
      ].join(',');

      const body = rows.map((r) => [
        escapeCsv(monthYear),
        r.rank,
        escapeCsv(r.editor),
        Number(r.total_actions),
        Number(r.prs_touched),
        escapeCsv(r.repo),
        r.pr_number,
        escapeCsv(r.pr_title),
        escapeCsv(r.action_type),
        escapeCsv(r.event_type),
        escapeCsv(r.review_state),
        escapeCsv(r.governance_state),
        escapeCsv(r.occurred_at.toISOString()),
      ].join(','));

      return {
        csv: [header, ...body].join('\n'),
        filename: `editor-leaderboard-detailed-${input.repo ?? 'all'}-${input.actor ? `${input.actor.toLowerCase()}-` : ''}${monthYear}.csv`,
      };
    }),
}
