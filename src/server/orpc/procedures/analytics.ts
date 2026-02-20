
import { os, checkAPIToken, requireAuth, protectedProcedure, publicProcedure, type Ctx } from './types'
import { prisma } from '@/lib/prisma'
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
      total_reviews: bigint;
      prs_touched: bigint;
      median_response_days: number | null;
    }>>(
      `
      WITH editor_activity AS (
        SELECT ca.actor, ca.pr_number, ca.repository_id, ca.occurred_at
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE UPPER(ca.role) = 'EDITOR'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND ($2::text IS NULL OR ca.occurred_at >= $2::timestamp)
          AND ($3::text IS NULL OR ca.occurred_at <= $3::timestamp)
      ),
      by_actor AS (
        SELECT actor, COUNT(*)::bigint AS total_reviews, COUNT(DISTINCT pr_number)::bigint AS prs_touched
        FROM editor_activity GROUP BY actor
      ),
      first_review AS (
        SELECT ea.actor, ea.pr_number, ea.repository_id, MIN(ea.occurred_at) AS first_at
        FROM editor_activity ea GROUP BY ea.actor, ea.pr_number, ea.repository_id
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
      SELECT ba.actor, ba.total_reviews, ba.prs_touched, m.median_response_days
      FROM by_actor ba LEFT JOIN medians m ON m.actor = ba.actor
      ORDER BY ba.total_reviews DESC LIMIT $4
    `,
      repo, from, to, limit
    );
    return results.map((r) => ({
      actor: r.actor,
      totalReviews: Number(r.total_reviews),
      prsTouched: Number(r.prs_touched),
      medianResponseDays: r.median_response_days != null ? Math.round(Number(r.median_response_days)) : null,
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
    }>>(
      `
      WITH reviewer_activity AS (
        SELECT ca.actor, ca.pr_number, ca.repository_id, ca.occurred_at
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE (UPPER(ca.role) = 'REVIEWER' OR (ca.action_type = 'reviewed' AND (ca.role IS NULL OR UPPER(ca.role) != 'EDITOR')))
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          AND ($2::text IS NULL OR ca.occurred_at >= $2::timestamp)
          AND ($3::text IS NULL OR ca.occurred_at <= $3::timestamp)
      ),
      by_actor AS (
        SELECT actor, COUNT(*)::bigint AS total_reviews, COUNT(DISTINCT pr_number)::bigint AS prs_touched
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
      SELECT ba.actor, ba.total_reviews, ba.prs_touched, m.median_response_days
      FROM by_actor ba LEFT JOIN medians m ON m.actor = ba.actor
      ORDER BY ba.total_reviews DESC LIMIT $4
    `,
      repo, from, to, limit
    );
    return results.map((r) => ({
      actor: r.actor,
      totalReviews: Number(r.total_reviews),
      prsTouched: Number(r.prs_touched),
      medianResponseDays: r.median_response_days != null ? Math.round(Number(r.median_response_days)) : null,
    }));
  },
  ['analytics-getReviewersLeaderboard'],
  { tags: ['analytics-reviewers-leaderboard'], revalidate: 600 }
);

// Official EIP editor assignments per category (governance-defined).
// Used as the canonical source because pull_request_eips may be empty.
const OFFICIAL_EDITORS_BY_CATEGORY: Record<string, string[]> = {
  governance: ['lightclient', 'SamWilsn', 'xinbenlv', 'g11tech', 'jochem-brouwer'],
  core: ['lightclient', 'SamWilsn', 'g11tech', 'jochem-brouwer'],
  erc: ['SamWilsn', 'xinbenlv'],
  networking: ['lightclient', 'SamWilsn', 'g11tech', 'jochem-brouwer'],
  interface: ['lightclient', 'SamWilsn', 'g11tech', 'jochem-brouwer'],
  meta: ['lightclient', 'SamWilsn', 'xinbenlv', 'g11tech', 'jochem-brouwer'],
  informational: ['lightclient', 'SamWilsn', 'xinbenlv', 'g11tech', 'jochem-brouwer'],
};

const getEditorsByCategoryCached = unstable_cache(
  async (repo: string | null) => {
    // Try activity-based derivation first (requires populated pull_request_eips)
    const results = await prisma.$queryRawUnsafe<Array<{
      category: string;
      actor: string;
      review_count: bigint;
    }>>(
      `
      WITH pr_eip AS (
        SELECT pr.id AS pr_id, pr.pr_number, pr.repository_id, pre.eip_number
        FROM pull_requests pr
        JOIN pull_request_eips pre ON pre.pr_number = pr.pr_number AND pre.repository_id = pr.repository_id
      ),
      review_with_category AS (
        SELECT ca.actor, COALESCE(LOWER(TRIM(es.category)), 'unknown') AS category
        FROM contributor_activity ca
        JOIN pr_eip pe ON pe.pr_number = ca.pr_number AND pe.repository_id = ca.repository_id
        JOIN eips e ON e.eip_number = pe.eip_number AND e.repository_id = pe.repository_id
        JOIN eip_snapshots es ON es.eip_id = e.id
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE (UPPER(ca.role) = 'EDITOR' OR ca.action_type = 'reviewed')
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
      ),
      ranked AS (
        SELECT category, actor, COUNT(*)::bigint AS review_count,
          ROW_NUMBER() OVER (PARTITION BY category ORDER BY COUNT(*) DESC) AS rn
        FROM review_with_category
        GROUP BY category, actor
      )
      SELECT category, actor, review_count FROM ranked WHERE rn <= 20 ORDER BY category, rn
    `,
      repo
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
    const source = hasActivityData ? byCategory : OFFICIAL_EDITORS_BY_CATEGORY;

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
      WITH base AS (
        SELECT ca.actor, COALESCE(r.name, 'Unknown') AS repo
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE UPPER(ca.role) = 'EDITOR'
          AND ($1::text IS NULL OR ca.actor = $1)
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
      actor, repo, from, to
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
      WITH base AS (
        SELECT ca.actor, COALESCE(r.name, 'Unknown') AS repo
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE (UPPER(ca.role) = 'REVIEWER' OR (ca.action_type = 'reviewed' AND (ca.role IS NULL OR UPPER(ca.role) != 'EDITOR')))
          AND ($1::text IS NULL OR ca.actor = $1)
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
      actor, repo, from, to
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

export const analyticsProcedures = {
  getActiveProposals: publicProcedure
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

  getActiveProposalsDetailed: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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

  getLifecycleData: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getLifecycleDataCached(input.repo ?? null);
    }),

  getLifecycleDetailed: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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

  getStandardsComposition: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getStandardsCompositionCached(input.repo ?? null);
    }),

  getStandardsCompositionDetailed: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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

  getRecentChanges: os
    .$context<Ctx>()
    .input(z.object({
      limit: z.number().optional().default(5),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        eip: string;
        eip_type: string;
        title: string;
        from: string;
        to: string;
        days: number;
        statusColor: string;
        repository: string;
        changed_at: Date;
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
          se.from_status as "from",
          se.to_status as "to",
          EXTRACT(DAY FROM (NOW() - se.changed_at))::int as days,
          CASE 
            WHEN se.to_status = 'Final' THEN 'emerald'
            WHEN se.to_status IN ('Review', 'Last Call') THEN 'blue'
            ELSE 'slate'
          END as "statusColor",
          r.name as repository,
          se.changed_at
        FROM eip_status_events se
        JOIN eips e ON se.eip_id = e.id
        LEFT JOIN eip_snapshots s ON s.eip_id = e.id
        LEFT JOIN repositories r ON se.repository_id = r.id
        WHERE se.changed_at >= NOW() - INTERVAL '7 days'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY se.changed_at DESC
        LIMIT $2
      `,
        input.repo ?? null,
        input.limit
      );

      return results;
    }),

  getDecisionVelocity: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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

  getMomentumData: os
    .$context<Ctx>()
    .input(z.object({
      months: z.number().optional().default(12),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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

  getRecentPRs: os
    .$context<Ctx>()
    .input(z.object({
      limit: z.number().optional().default(5),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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

  getLastCallWatchlist: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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
  getPRMonthlyActivity: os
    .$context<Ctx>()
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      return getPRMonthlyActivityCached(
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null
      );
    }),

  getPROpenState: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const [stats, oldest] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{
          total_open: bigint;
          median_age: number;
        }>>(`
          WITH open_prs AS (
            SELECT 
              pr.pr_number,
              EXTRACT(DAY FROM (NOW() - pr.created_at))::int as age
            FROM pull_requests pr
            JOIN repositories r ON pr.repository_id = r.id
            WHERE pr.state = 'open'
              AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          )
          SELECT 
            COUNT(*)::bigint as total_open,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY age)::numeric as median_age
          FROM open_prs
        `, input.repo || null),
        prisma.$queryRawUnsafe<Array<{
          pr_number: number;
          title: string;
          author: string;
          age_days: number;
          repo: string;
        }>>(`
          SELECT 
            pr.pr_number,
            pr.title,
            pr.author,
            EXTRACT(DAY FROM (NOW() - pr.created_at))::int as age_days,
            r.name as repo
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.state = 'open'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          ORDER BY pr.created_at ASC
          LIMIT 1
        `, input.repo || null),
      ]);

      return {
        totalOpen: Number(stats[0]?.total_open || 0),
        medianAge: Math.round(Number(stats[0]?.median_age || 0)),
        oldestPR: oldest[0] || null,
      };
    }),

  getPRGovernanceStates: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getPRGovernanceStatesCached(input.repo ?? null);
    }),

  getPRLabels: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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

  getPRLifecycleFunnel: os
    .$context<Ctx>()
    .input(z.object({}))
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

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

  getPRTimeToOutcome: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getPRTimeToOutcomeCached(input.repo ?? null);
    }),

  getPRStaleness: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getPRStalenessCached(input.repo ?? null);
    }),

  getPRStaleHighRisk: os
    .$context<Ctx>()
    .input(z.object({
      days: z.number().optional().default(30),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        repo: string;
        title: string;
        author: string;
        age_days: number;
        last_activity: string;
      }>>(`
        WITH open_prs AS (
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
  getPRMonthHeroKPIs: os
    .$context<Ctx>()
    .input(z.object({
      year: z.number(),
      month: z.number(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const monthStr = `${input.year}-${String(input.month).padStart(2, '0')}`;
      const monthEndDate = `${monthStr}-01`; // last day computed in SQL as end of month

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
      `, input.repo || null, monthStr);

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
    }),

  // Open PR classification (DRAFT, TYPO, NEW_EIP, STATUS_CHANGE, OTHER) — one bucket per PR
  getPROpenClassification: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        category: string;
        count: bigint;
      }>>(`
        WITH open_prs AS (
          SELECT pr.id AS pr_id, pr.pr_number, pr.repository_id, pr.title
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.state = 'open'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ),
        classified AS (
          SELECT op.pr_id,
            CASE
              WHEN LOWER(COALESCE(op.title, '')) LIKE '%wip%' OR LOWER(COALESCE(op.title, '')) LIKE '%draft%' THEN 'DRAFT'
              WHEN LOWER(COALESCE(op.title, '')) LIKE '%typo%' OR LOWER(COALESCE(op.title, '')) LIKE '%fix typo%'
                OR LOWER(COALESCE(op.title, '')) LIKE '%editorial%' OR LOWER(COALESCE(op.title, '')) LIKE '%grammar%' THEN 'TYPO'
              WHEN EXISTS (
                SELECT 1 FROM pull_request_eips pre
                JOIN eips e ON e.eip_number = pre.eip_number
                JOIN eip_snapshots s ON s.eip_id = e.id
                WHERE pre.pr_number = op.pr_number AND pre.repository_id = op.repository_id AND s.status = 'Draft'
              ) THEN 'NEW_EIP'
              WHEN EXISTS (
                SELECT 1 FROM pull_request_eips pre
                JOIN eips e ON e.eip_number = pre.eip_number
                JOIN eip_status_events ese ON ese.eip_id = e.id AND ese.pr_number = op.pr_number
                WHERE pre.pr_number = op.pr_number AND pre.repository_id = op.repository_id
              ) THEN 'STATUS_CHANGE'
              ELSE 'OTHER'
            END AS category
          FROM open_prs op
        )
        SELECT category, COUNT(*)::bigint AS count
        FROM classified
        GROUP BY category
        ORDER BY count DESC
      `, input.repo || null);

      const order = ['DRAFT', 'TYPO', 'NEW_EIP', 'STATUS_CHANGE', 'OTHER'];
      const byCat = Object.fromEntries(results.map(r => [r.category, Number(r.count)]));
      return order.map(category => ({ category, count: byCat[category] ?? 0 }));
    }),

  // Governance waiting state with median wait and oldest PR per bucket
  getPRGovernanceWaitingState: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        state: string;
        label: string;
        count: bigint;
        median_wait_days: number | null;
        oldest_pr_number: number | null;
        oldest_wait_days: number | null;
      }>>(`
        WITH open_with_state AS (
          SELECT pr.pr_number, pr.repository_id, r.name AS repo_name,
                 COALESCE(gs.current_state, 'NO_STATE') AS state,
                 gs.waiting_since
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          LEFT JOIN pr_governance_state gs ON pr.pr_number = gs.pr_number AND pr.repository_id = gs.repository_id
          WHERE pr.state = 'open'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ),
        wait_days AS (
          SELECT state, pr_number,
                 EXTRACT(DAY FROM (NOW() - COALESCE(waiting_since, NOW())))::int AS wait_days
          FROM open_with_state
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
               CASE bs.state WHEN 'WAITING_ON_EDITOR' THEN 'Waiting on Editor' WHEN 'WAITING_ON_AUTHOR' THEN 'Waiting on Author'
                 WHEN 'STALLED' THEN 'Stalled' WHEN 'DRAFT' THEN 'Draft' ELSE 'No State' END AS label,
               bs.count,
               bs.median_wait_days::numeric,
               op.oldest_pr_number,
               op.oldest_wait_days::numeric
        FROM by_state bs
        LEFT JOIN oldest_per_state op ON op.state = bs.state
        ORDER BY bs.count DESC
      `, input.repo || null);

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
  getPROpenExport: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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
        SELECT pr.pr_number, r.name AS repo, pr.title, pr.author,
               TO_CHAR(pr.created_at, 'YYYY-MM-DD') AS created_at,
               COALESCE(gs.current_state, 'NO_STATE') AS state,
               TO_CHAR(gs.waiting_since, 'YYYY-MM-DD') AS waiting_since,
               gs.last_event_type,
               (SELECT STRING_AGG(pre.eip_number::text, ',') FROM pull_request_eips pre WHERE pre.pr_number = pr.pr_number AND pre.repository_id = pr.repository_id) AS linked_eips
        FROM pull_requests pr
        JOIN repositories r ON pr.repository_id = r.id
        LEFT JOIN pr_governance_state gs ON pr.pr_number = gs.pr_number AND pr.repository_id = gs.repository_id
        WHERE pr.state = 'open'
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY pr.created_at ASC
      `, input.repo || null);

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

  // ——— Contributors Analytics ———
  getContributorKPIs: os
    .$context<Ctx>()
    .input(z.object({}))
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);
      return getContributorKPIsCached();
    }),

  getContributorActivityByType: os
    .$context<Ctx>()
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getContributorActivityByTypeCached(
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null
      );
    }),

  getContributorActivityByRepo: os
    .$context<Ctx>()
    .input(z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getContributorActivityByRepoCached(
        input.from ?? null,
        input.to ?? null
      );
    }),

  getContributorRankings: os
    .$context<Ctx>()
    .input(z.object({
      sortBy: z.enum(['total', 'reviews', 'status_changes', 'prs_authored', 'prs_reviewed']).optional().default('total'),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
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

  getContributorProfile: os
    .$context<Ctx>()
    .input(z.object({ actor: z.string(), limit: z.number().optional().default(100) }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const activities = await prisma.contributor_activity.findMany({
        where: { actor: input.actor },
        orderBy: { occurred_at: 'desc' },
        take: input.limit,
        include: { repositories: true },
      });
      const byRepo = activities.reduce(
        (acc, a) => {
          const name = a.repositories?.name ?? 'Unknown';
          acc[name] = (acc[name] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      return {
        actor: input.actor,
        totalActivities: activities.length,
        byRepo: Object.entries(byRepo).map(([repo, count]) => ({ repo, count })),
        recentActivities: activities.map((a) => ({
          actionType: a.action_type,
          prNumber: a.pr_number,
          repo: a.repositories?.name ?? null,
          occurredAt: a.occurred_at.toISOString(),
        })),
      };
    }),

  getContributorLiveFeed: os
    .$context<Ctx>()
    .input(z.object({ hours: z.number().optional().default(48), limit: z.number().optional().default(50) }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
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

  // ——— Authors Analytics ———
  getAuthorKPIs: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const periodStart = input.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const [prStats, eipStats] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{
          total_authors: bigint;
          new_authors: bigint;
          prs_created: bigint;
        }>>(
          `
          WITH pr_authors AS (
            SELECT DISTINCT pr.author, pr.created_at
            FROM pull_requests pr
            JOIN repositories r ON pr.repository_id = r.id
            WHERE pr.author IS NOT NULL
              AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
              AND ($2::text IS NULL OR pr.created_at >= $2::timestamp)
              AND ($3::text IS NULL OR pr.created_at <= $3::timestamp)
          )
          SELECT
            COUNT(DISTINCT author)::bigint as total_authors,
            COUNT(DISTINCT author) FILTER (WHERE created_at >= $4::timestamp)::bigint as new_authors,
            COUNT(*)::bigint as prs_created
          FROM pr_authors
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
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        `,
          input.repo ?? null
        ),
      ]);

      const prRow = prStats[0] || {
        total_authors: BigInt(0),
        new_authors: BigInt(0),
        prs_created: BigInt(0),
      };
      const eipRow = eipStats[0] || {
        eips_authored: BigInt(0),
      };

      return {
        totalAuthors: Number(prRow.total_authors),
        newAuthors: Number(prRow.new_authors),
        prsCreated: Number(prRow.prs_created),
        eipsAuthored: Number(eipRow.eips_authored),
      };
    }),

  getAuthorActivityTimeline: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      months: z.number().optional().default(12),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
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

  getAuthorSuccessRates: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      limit: z.number().optional().default(20),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
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

  getTopAuthors: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const results = await prisma.$queryRawUnsafe<Array<{
        author: string;
        prs_created: bigint;
        prs_merged: bigint;
        avg_time_to_merge: number | null;
        last_activity: string | null;
      }>>(
        `
        WITH author_stats AS (
          SELECT 
            pr.author,
            COUNT(*)::bigint as prs_created,
            COUNT(*) FILTER (WHERE pr.merged_at IS NOT NULL)::bigint as prs_merged,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (pr.merged_at - pr.created_at))) FILTER (WHERE pr.merged_at IS NOT NULL)::numeric as avg_time_to_merge,
            MAX(pr.updated_at)::text as last_activity
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.author IS NOT NULL
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            AND ($2::text IS NULL OR pr.created_at >= $2::timestamp)
            AND ($3::text IS NULL OR pr.created_at <= $3::timestamp)
          GROUP BY pr.author
        )
        SELECT * FROM author_stats
        ORDER BY prs_created DESC
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
        avgTimeToMerge: r.avg_time_to_merge != null ? Math.round(Number(r.avg_time_to_merge)) : null,
        lastActivity: r.last_activity,
      }));
    }),

  // ——— Editors & Reviewers Analytics (cached) ———
  getEditorsLeaderboard: os
    .$context<Ctx>()
    .input(z.object({
      limit: z.number().optional().default(30),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getEditorsLeaderboardCached(
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null,
        input.limit
      );
    }),

  getEditorsLeaderboardExport: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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
          SELECT ca.actor, ca.pr_number, r.name AS repo_name,
                 TO_CHAR(ca.occurred_at, 'YYYY-MM-DD HH24:MI:SS') AS occurred_at,
                 ca.action_type
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE UPPER(COALESCE(ca.role, '')) = 'EDITOR'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
            AND ($2::text IS NULL OR ca.occurred_at >= $2::timestamp)
            AND ($3::text IS NULL OR ca.occurred_at <= $3::timestamp)
          ORDER BY ca.actor, ca.occurred_at ASC
          `,
          input.repo ?? null,
          input.from ?? null,
          input.to ?? null
        ),
      ]);

      const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

      const summaryRows = [
        'Rank,Editor,Total Reviews,PRs Touched,Median Response (days)',
        ...summary.map((r, i) =>
          [i + 1, r.actor, r.totalReviews, r.prsTouched, r.medianResponseDays ?? ''].map(escape).join(',')
        ),
      ];

      const detailRows = [
        '',
        'Editor,PR Number,Repository,Occurred At,Action Type',
        ...details.map((r) =>
          [r.actor, r.pr_number, r.repo_name ?? '', r.occurred_at, r.action_type].map(escape).join(',')
        ),
      ];

      const csv = [...summaryRows, ...detailRows].join('\n');
      const monthLabel = input.from
        ? `${input.from.slice(0, 7)}`
        : new Date().toISOString().slice(0, 7);
      const filename = `editors-leaderboard-${monthLabel}.csv`;

      return { csv, filename };
    }),

  getReviewersLeaderboard: os
    .$context<Ctx>()
    .input(z.object({
      limit: z.number().optional().default(30),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getReviewersLeaderboardCached(
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null,
        input.limit
      );
    }),

  getEditorsByCategory: os
    .$context<Ctx>()
    .input(z.object({ repo: z.enum(['eips', 'ercs', 'rips']).optional() }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getEditorsByCategoryCached(input.repo ?? null);
    }),

  getEditorsRepoDistribution: os
    .$context<Ctx>()
    .input(z.object({
      actor: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getEditorsRepoDistributionCached(
        input.actor ?? null,
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null
      );
    }),

  getReviewersRepoDistribution: os
    .$context<Ctx>()
    .input(z.object({
      actor: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getReviewersRepoDistributionCached(
        input.actor ?? null,
        input.repo ?? null,
        input.from ?? null,
        input.to ?? null
      );
    }),

  getEditorsMonthlyTrend: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      months: z.number().optional().default(12),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        actor: string;
        count: bigint;
      }>>(
        `
        SELECT
          TO_CHAR(date_trunc('month', ca.occurred_at), 'YYYY-MM') as month,
          ca.actor,
          COUNT(*)::bigint as count
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE UPPER(ca.role) = 'EDITOR'
          AND ca.occurred_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $2)
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY date_trunc('month', ca.occurred_at), ca.actor
        ORDER BY month ASC, count DESC
      `,
        input.repo ?? null,
        (input.months || 12) - 1
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

  getReviewersMonthlyTrend: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      months: z.number().optional().default(12),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        actor: string;
        count: bigint;
      }>>(
        `
        SELECT
          TO_CHAR(date_trunc('month', ca.occurred_at), 'YYYY-MM') as month,
          ca.actor,
          COUNT(*)::bigint as count
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE (UPPER(ca.role) = 'REVIEWER' OR (ca.action_type = 'reviewed' AND (ca.role IS NULL OR UPPER(ca.role) != 'EDITOR')))
          AND ca.occurred_at >= date_trunc('month', NOW() - INTERVAL '1 month' * $2)
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY date_trunc('month', ca.occurred_at), ca.actor
        ORDER BY month ASC, count DESC
      `,
        input.repo ?? null,
        (input.months || 12) - 1
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

  getReviewerCyclesPerPR: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const results = await prisma.$queryRawUnsafe<Array<{
        cycles: number;
        count: bigint;
      }>>(
        `
        WITH pr_review_counts AS (
          SELECT 
            ca.pr_number,
            ca.repository_id,
            COUNT(DISTINCT ca.actor) FILTER (WHERE ca.action_type = 'reviewed') as review_cycles
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE (UPPER(ca.role) = 'REVIEWER' OR (ca.action_type = 'reviewed' AND (ca.role IS NULL OR UPPER(ca.role) != 'EDITOR')))
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
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
        input.repo ?? null
      );
      
      return results.map(r => ({
        cycles: r.cycles,
        count: Number(r.count),
      }));
    }),

  getMonthlyReviewTrend: os
    .$context<Ctx>()
    .input(z.object({
      actor: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const results = await prisma.$queryRawUnsafe<Array<{ month: string; count: bigint }>>(
        `
        SELECT TO_CHAR(date_trunc('month', ca.occurred_at), 'YYYY-MM') AS month, COUNT(*)::bigint AS count
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE (UPPER(ca.role) = 'EDITOR' OR ca.action_type = 'reviewed')
          AND ($1::text IS NULL OR ca.actor = $1)
          AND ($2::text IS NULL OR ca.occurred_at >= $2::timestamp)
          AND ($3::text IS NULL OR ca.occurred_at <= $3::timestamp)
          AND ($4::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($4))
        GROUP BY date_trunc('month', ca.occurred_at)
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
  getEIPStatusTransitions: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getEIPStatusTransitionsCached(
        input.repo ?? null,
        input.from || null,
        input.to || null
      );
    }),

  getEIPThroughput: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      months: z.number().optional().default(12),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const monthsParam = input.months || 12;
      return getEIPThroughputCached(input.repo ?? null, monthsParam);
    }),

  getEIPHeroKPIs: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const periodStart =
        input.from ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

      return getEIPHeroKPIsCached(input.repo ?? null, periodStart);
    }),

  // ——— Monthly Editor Leaderboard ———
  // PRs where an official editor was last_actor (governance state) AND the PR was updated this month.
  // Conservative metric: only counts PRs that had governance-state-changing editor action this month.
  getMonthlyEditorLeaderboard: os
    .$context<Ctx>()
    .input(z.object({ limit: z.number().optional().default(10) }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = now.getMonth() === 11
        ? `${now.getFullYear() + 1}-01-01`
        : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`;

      const allEditors = Array.from(new Set(
        Object.values(OFFICIAL_EDITORS_BY_CATEGORY).flat()
      ));

      const results = await prisma.$queryRawUnsafe<Array<{
        actor: string;
        prs_touched: bigint;
      }>>(
        `
        SELECT pg.last_actor AS actor, COUNT(DISTINCT pr.pr_number)::bigint AS prs_touched
        FROM pull_requests pr
        JOIN pr_governance_state pg ON pg.pr_number = pr.pr_number AND pg.repository_id = pr.repository_id
        WHERE pg.last_actor = ANY($1::text[])
          AND pr.updated_at >= $2::date AND pr.updated_at < $3::date
        GROUP BY pg.last_actor
        ORDER BY prs_touched DESC
        LIMIT $4
        `,
        allEditors, monthStart, nextMonth, input.limit
      );

      return results.map((r) => ({
        actor: r.actor,
        totalActions: Number(r.prs_touched),
        prsTouched: Number(r.prs_touched),
      }));
    }),
}
