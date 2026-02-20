/**
 * Batch procedures to reduce parallel RPC calls and DB connections.
 * One page load = one request = one serverless instance = one connection.
 */
import { os, checkAPIToken, type Ctx } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'
import { getLifecycleDataCached, getStandardsCompositionCached } from './analytics'

const repoFilterSchema = z.object({
  repo: z.enum(['eips', 'ercs', 'rips']).optional(),
})

export const dashboardProcedures = {
  /** Batch: KPIs, crosstab, status dist, category breakdown, status flow, repo dist, monthly delta, upgrade impact, decision velocity, RIP KPIs */
  getDashboardOverview: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repo = input.repo ?? null;

      try {
      // Run in batches to avoid exhausting DB connection pool (max ~4 concurrent)
      const [kpisRes, crosstabRes, statusDistRes, categoryBreakdownRes] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ total: bigint; in_review: bigint; finalized: bigint; new_this_year: bigint }>>(
          `SELECT COUNT(*)::bigint AS total,
            COUNT(*) FILTER (WHERE s.status IN ('Draft', 'Review', 'Last Call'))::bigint AS in_review,
            COUNT(*) FILTER (WHERE s.status = 'Final')::bigint AS finalized,
            COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM e.created_at) = EXTRACT(YEAR FROM CURRENT_DATE))::bigint AS new_this_year
          FROM eip_snapshots s JOIN eips e ON s.eip_id = e.id LEFT JOIN repositories r ON s.repository_id = r.id
          WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))`,
          repo
        ),
        prisma.$queryRawUnsafe<Array<{ category: string; status: string; repo_group: string; count: bigint }>>(
          `SELECT COALESCE(NULLIF(s.category, ''), s.type, 'Unknown') AS category, s.status,
            CASE WHEN s.category = 'ERC' OR LOWER(SPLIT_PART(r.name, '/', 2)) = 'ercs' THEN 'ERCs'
              WHEN LOWER(SPLIT_PART(r.name, '/', 2)) = 'rips' THEN 'RIPs' ELSE 'EIPs' END AS repo_group,
            COUNT(*)::bigint AS count
          FROM eip_snapshots s LEFT JOIN repositories r ON s.repository_id = r.id
          GROUP BY COALESCE(NULLIF(s.category, ''), s.type, 'Unknown'), s.status,
            CASE WHEN s.category = 'ERC' OR LOWER(SPLIT_PART(r.name, '/', 2)) = 'ercs' THEN 'ERCs'
              WHEN LOWER(SPLIT_PART(r.name, '/', 2)) = 'rips' THEN 'RIPs' ELSE 'EIPs' END
          ORDER BY 1, 2`
        ),
        prisma.$queryRawUnsafe<Array<{ status: string; repo_short: string; count: bigint }>>(
          `SELECT s.status, LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short, COUNT(*)::bigint AS count
          FROM eip_snapshots s LEFT JOIN repositories r ON s.repository_id = r.id
          WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          GROUP BY s.status, LOWER(SPLIT_PART(r.name, '/', 2)) ORDER BY count DESC`,
          repo
        ),
        prisma.$queryRawUnsafe<Array<{ category: string; count: bigint }>>(
          `SELECT CASE WHEN s.category IS NOT NULL AND TRIM(s.category) <> '' THEN s.category
            WHEN TRIM(COALESCE(s.type, '')) <> '' THEN s.type ELSE 'Other' END AS category,
            COUNT(*)::bigint AS count
          FROM eip_snapshots s LEFT JOIN repositories r ON s.repository_id = r.id
          WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          GROUP BY CASE WHEN s.category IS NOT NULL AND TRIM(s.category) <> '' THEN s.category
            WHEN TRIM(COALESCE(s.type, '')) <> '' THEN s.type ELSE 'Other' END ORDER BY count DESC`,
          repo
        ),
      ]);

      const [statusFlowRes, repoDistRes, monthlyDeltaRes] = await Promise.all([
        prisma.eip_snapshots.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        (async () => {
          try {
            const eips = await prisma.$queryRawUnsafe<Array<{ proposals: bigint; active_prs: bigint; finals: bigint }>>(
              `SELECT COUNT(DISTINCT s.eip_id)::bigint AS proposals,
                (SELECT COUNT(*)::bigint FROM pull_requests pr JOIN repositories r2 ON pr.repository_id = r2.id
                 WHERE pr.state = 'open' AND LOWER(SPLIT_PART(r2.name, '/', 2)) = 'eips')::bigint AS active_prs,
                COUNT(DISTINCT s.eip_id) FILTER (WHERE s.status = 'Final')::bigint AS finals
              FROM eip_snapshots s LEFT JOIN repositories r ON s.repository_id = r.id
              WHERE LOWER(SPLIT_PART(r.name, '/', 2)) = 'eips' AND r.active = true`
            );
            const ercs = await prisma.$queryRawUnsafe<Array<{ proposals: bigint; active_prs: bigint; finals: bigint }>>(
              `SELECT COUNT(DISTINCT s.eip_id)::bigint AS proposals,
                (SELECT COUNT(*)::bigint FROM pull_requests pr JOIN repositories r2 ON pr.repository_id = r2.id
                 WHERE pr.state = 'open' AND LOWER(SPLIT_PART(r2.name, '/', 2)) = 'ercs')::bigint AS active_prs,
                COUNT(DISTINCT s.eip_id) FILTER (WHERE s.status = 'Final')::bigint AS finals
              FROM eip_snapshots s LEFT JOIN repositories r ON s.repository_id = r.id
              WHERE s.category = 'ERC' AND r.id IS NOT NULL`
            );
            const rips = await prisma.$queryRawUnsafe<Array<{ proposals: bigint; finals: bigint; active_prs: bigint }>>(
              `SELECT (SELECT COUNT(*)::bigint FROM rips)::bigint AS proposals,
                (SELECT COUNT(*) FILTER (WHERE status = 'Final')::bigint FROM rips)::bigint AS finals,
                (SELECT COUNT(*)::bigint FROM pull_requests pr JOIN repositories r2 ON pr.repository_id = r2.id
                 WHERE pr.state = 'open' AND LOWER(SPLIT_PART(r2.name, '/', 2)) = 'rips')::bigint AS active_prs`
            );
            const rows: Array<{ repo: string; proposals: number; activePRs: number; finals: number }> = [
              { repo: 'ethereum/EIPs', proposals: Number(eips[0]?.proposals ?? 0), activePRs: Number(eips[0]?.active_prs ?? 0), finals: Number(eips[0]?.finals ?? 0) },
              { repo: 'ethereum/ERCs', proposals: Number(ercs[0]?.proposals ?? 0), activePRs: Number(ercs[0]?.active_prs ?? 0), finals: Number(ercs[0]?.finals ?? 0) },
            ];
            if (Number(rips[0]?.proposals ?? 0) > 0) {
              rows.push({ repo: 'ethereum/RIPs', proposals: Number(rips[0]?.proposals ?? 0), activePRs: Number(rips[0]?.active_prs ?? 0), finals: Number(rips[0]?.finals ?? 0) });
            }
            return rows;
          } catch (e) {
            console.warn('[getDashboardOverview] getRepoDistribution failed:', e);
            return [];
          }
        })(),
        prisma.$queryRawUnsafe<Array<{ to_status: string; count: bigint }>>(
          `SELECT se.to_status, COUNT(*)::bigint AS count FROM eip_status_events se
           WHERE se.changed_at >= date_trunc('month', CURRENT_DATE) GROUP BY se.to_status ORDER BY count DESC`
        ),
      ]);

      const [upgradeImpactRes, decisionVelocityRes, ripKpisRes] = await Promise.all([
        (async () => {
          try {
            return await prisma.$queryRawUnsafe<Array<{ upgrade_name: string; slug: string; total: bigint; finalized: bigint; in_review: bigint; draft: bigint; last_call: bigint }>>(
              `SELECT u.name AS upgrade_name, u.slug, COUNT(*)::bigint AS total,
                COUNT(*) FILTER (WHERE s.status = 'Final')::bigint AS finalized,
                COUNT(*) FILTER (WHERE s.status = 'Review')::bigint AS in_review,
                COUNT(*) FILTER (WHERE s.status = 'Draft')::bigint AS draft,
                COUNT(*) FILTER (WHERE s.status = 'Last Call')::bigint AS last_call
              FROM upgrades u JOIN upgrade_composition_current ucc ON ucc.upgrade_id = u.id
              JOIN eips e ON e.eip_number = ucc.eip_number JOIN eip_snapshots s ON s.eip_id = e.id
              GROUP BY u.id, u.name, u.slug ORDER BY u.id DESC LIMIT 6`
            );
          } catch (e) {
            console.warn('[getDashboardOverview] getUpgradeImpact failed:', e);
            return [];
          }
        })(),
        prisma.$queryRawUnsafe<Array<{ from_status: string; to_status: string; median_days: number | null; count: bigint }>>(
          `WITH repo_filtered AS (
            SELECT se.eip_id, se.repository_id, se.from_status, se.to_status, se.changed_at
            FROM eip_status_events se LEFT JOIN repositories r ON se.repository_id = r.id
            WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
              AND se.changed_at >= NOW() - INTERVAL '365 days'
          ),
          step_events AS (
            SELECT e.eip_id, e.repository_id, e.from_status, e.to_status, e.changed_at,
              (SELECT MAX(e2.changed_at) FROM repo_filtered e2 WHERE e2.eip_id = e.eip_id AND e2.repository_id = e.repository_id
                AND e2.to_status = e.from_status AND e2.changed_at < e.changed_at) AS entered_from_at
            FROM repo_filtered e
            WHERE (e.from_status, e.to_status) IN (('Draft', 'Review'), ('Review', 'Last Call'), ('Last Call', 'Final'), ('Draft', 'Withdrawn'))
          ),
          draft_final_events AS (
            SELECT e.eip_id, e.repository_id, e.changed_at,
              (SELECT MIN(e2.changed_at) FROM repo_filtered e2 WHERE e2.eip_id = e.eip_id AND e2.repository_id = e.repository_id
                AND e2.to_status = 'Draft' AND e2.changed_at < e.changed_at) AS first_draft_at
            FROM repo_filtered e WHERE e.from_status = 'Draft' AND e.to_status = 'Final'
          ),
          step_durations AS (
            SELECT from_status, to_status, EXTRACT(DAY FROM (changed_at - entered_from_at)) AS days
            FROM step_events WHERE entered_from_at IS NOT NULL AND EXTRACT(DAY FROM (changed_at - entered_from_at)) >= 0
          ),
          draft_final_durations AS (
            SELECT 'Draft'::text AS from_status, 'Final'::text AS to_status,
              EXTRACT(DAY FROM (changed_at - first_draft_at)) AS days
            FROM draft_final_events WHERE first_draft_at IS NOT NULL AND EXTRACT(DAY FROM (changed_at - first_draft_at)) >= 0
          ),
          all_durations AS (
            SELECT from_status, to_status, days FROM step_durations UNION ALL SELECT from_status, to_status, days FROM draft_final_durations
          )
          SELECT from_status, to_status,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days)::numeric AS median_days, COUNT(*)::bigint AS count
          FROM all_durations GROUP BY from_status, to_status
          ORDER BY CASE from_status WHEN 'Draft' THEN 1 WHEN 'Review' THEN 2 WHEN 'Last Call' THEN 3 ELSE 4 END,
            CASE to_status WHEN 'Review' THEN 1 WHEN 'Last Call' THEN 2 WHEN 'Final' THEN 3 WHEN 'Withdrawn' THEN 4 ELSE 5 END`,
          repo
        ),
        prisma.$queryRawUnsafe<Array<{ total: bigint; active: bigint }>>(
          `SELECT (SELECT COUNT(*)::bigint FROM rips) AS total,
            (SELECT COUNT(*)::bigint FROM rips WHERE status NOT IN ('Withdrawn', 'Stagnant') OR status IS NULL) AS active`
        ),
      ]);

      const kpisRow = kpisRes[0];
      const statusOrder = ['Draft', 'Review', 'Last Call', 'Final', 'Stagnant', 'Withdrawn'];
      const statusFlowCountMap = new Map(statusFlowRes.map(s => [s.status, s._count.status]));
      const transitions = decisionVelocityRes.map(r => ({
        from: r.from_status,
        to: r.to_status,
        medianDays: r.median_days != null ? Math.round(Number(r.median_days)) : null,
        count: Number(r.count),
      }));
      const draftToFinal = transitions.find(t => t.from === 'Draft' && t.to === 'Final');
      const draftToFinalMedian = draftToFinal?.medianDays ?? 0;
      const previousYearPlaceholder = draftToFinalMedian > 0 ? draftToFinalMedian + 42 : 0;
      const ripRow = ripKpisRes[0];

      return {
        kpis: {
          total: Number(kpisRow?.total ?? 0),
          inReview: Number(kpisRow?.in_review ?? 0),
          finalized: Number(kpisRow?.finalized ?? 0),
          newThisYear: Number(kpisRow?.new_this_year ?? 0),
        },
        categoryStatusCrosstab: crosstabRes.map(r => ({
          category: r.category,
          status: r.status,
          repo: r.repo_group,
          count: Number(r.count),
        })),
        statusDistribution: statusDistRes.map(r => ({
          status: r.status,
          repo: r.repo_short || 'unknown',
          count: Number(r.count),
        })),
        categoryBreakdown: categoryBreakdownRes.map(r => ({ category: r.category, count: Number(r.count) })),
        statusFlow: statusOrder.map(status => ({ status, count: statusFlowCountMap.get(status) || 0 })),
        repoDistribution: repoDistRes,
        monthlyDelta: monthlyDeltaRes.map(r => ({ status: r.to_status, count: Number(r.count) })),
        upgradeImpact: upgradeImpactRes.map(r => ({
          name: r.upgrade_name || r.slug,
          slug: r.slug,
          total: Number(r.total),
          finalized: Number(r.finalized),
          inReview: Number(r.in_review),
          draft: Number(r.draft),
          lastCall: Number(r.last_call),
        })),
        decisionVelocity: {
          transitions,
          draftToFinalMedian,
          previousYearPlaceholder,
          change: previousYearPlaceholder > 0 ? Math.round((-15 * draftToFinalMedian) / previousYearPlaceholder) : 0,
        },
        ripKpis: { total: Number(ripRow?.total ?? 0), active: Number(ripRow?.active ?? 0) },
      };
      } catch (err) {
        console.error('[getDashboardOverview]', err);
        throw err;
      }
    }),

  /** Batch: active proposals, lifecycle, standards composition, recent changes, decision velocity, momentum, recent PRs, last call watchlist */
  getProtocolBentoData: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      recentChangesLimit: z.number().optional().default(20),
      recentPRsLimit: z.number().optional().default(3),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repo = input.repo ?? null;

      const [
        activeProposalsRes,
        lifecycleRes,
        standardsRes,
        recentChangesRes,
        decisionVelocityRes,
        momentumRes,
        recentPRsRes,
        lastCallRes,
      ] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ draft: bigint; review: bigint; last_call: bigint; total: bigint }>>(
          `SELECT COUNT(*) FILTER (WHERE s.status = 'Draft') as draft,
            COUNT(*) FILTER (WHERE s.status = 'Review') as review,
            COUNT(*) FILTER (WHERE s.status = 'Last Call') as last_call, COUNT(*) as total
          FROM eip_snapshots s LEFT JOIN repositories r ON s.repository_id = r.id
          WHERE s.status IN ('Draft', 'Review', 'Last Call')
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))`,
          repo
        ),
        getLifecycleDataCached(repo),
        getStandardsCompositionCached(repo),
        prisma.$queryRawUnsafe<Array<{ eip: string; eip_type: string; title: string; from: string; to: string; days: number; statusColor: string; repository: string; changed_at: Date }>>(
          `SELECT e.eip_number::text as eip,
            CASE WHEN s.category = 'ERC' THEN 'ERC' WHEN r.name LIKE '%RIPs%' THEN 'RIP' ELSE 'EIP' END as eip_type,
            e.title, se.from_status as "from", se.to_status as "to",
            EXTRACT(DAY FROM (NOW() - se.changed_at))::int as days,
            CASE WHEN se.to_status = 'Final' THEN 'emerald' WHEN se.to_status IN ('Review', 'Last Call') THEN 'blue' ELSE 'slate' END as "statusColor",
            r.name as repository, se.changed_at
          FROM eip_status_events se JOIN eips e ON se.eip_id = e.id
          LEFT JOIN eip_snapshots s ON s.eip_id = e.id LEFT JOIN repositories r ON se.repository_id = r.id
          WHERE se.changed_at >= NOW() - INTERVAL '7 days'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          ORDER BY se.changed_at DESC LIMIT $2`,
          repo,
          input.recentChangesLimit
        ),
        prisma.$queryRawUnsafe<Array<{ from_status: string; to_status: string; median_days: number | null; count: bigint }>>(
          `WITH repo_filtered AS (
            SELECT se.eip_id, se.repository_id, se.from_status, se.to_status, se.changed_at
            FROM eip_status_events se LEFT JOIN repositories r ON se.repository_id = r.id
            WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
              AND se.changed_at >= NOW() - INTERVAL '365 days'
          ),
          step_events AS (
            SELECT e.eip_id, e.repository_id, e.from_status, e.to_status, e.changed_at,
              (SELECT MAX(e2.changed_at) FROM repo_filtered e2 WHERE e2.eip_id = e.eip_id AND e2.repository_id = e.repository_id
                AND e2.to_status = e.from_status AND e2.changed_at < e.changed_at) AS entered_from_at
            FROM repo_filtered e
            WHERE (e.from_status, e.to_status) IN (('Draft', 'Review'), ('Review', 'Last Call'), ('Last Call', 'Final'), ('Draft', 'Withdrawn'))
          ),
          draft_final_events AS (
            SELECT e.eip_id, e.repository_id, e.changed_at,
              (SELECT MIN(e2.changed_at) FROM repo_filtered e2 WHERE e2.eip_id = e.eip_id AND e2.repository_id = e.repository_id
                AND e2.to_status = 'Draft' AND e2.changed_at < e.changed_at) AS first_draft_at
            FROM repo_filtered e WHERE e.from_status = 'Draft' AND e.to_status = 'Final'
          ),
          step_durations AS (
            SELECT from_status, to_status, EXTRACT(DAY FROM (changed_at - entered_from_at)) AS days
            FROM step_events WHERE entered_from_at IS NOT NULL AND EXTRACT(DAY FROM (changed_at - entered_from_at)) >= 0
          ),
          draft_final_durations AS (
            SELECT 'Draft'::text AS from_status, 'Final'::text AS to_status,
              EXTRACT(DAY FROM (changed_at - first_draft_at)) AS days
            FROM draft_final_events WHERE first_draft_at IS NOT NULL AND EXTRACT(DAY FROM (changed_at - first_draft_at)) >= 0
          ),
          all_durations AS (
            SELECT from_status, to_status, days FROM step_durations UNION ALL SELECT from_status, to_status, days FROM draft_final_durations
          )
          SELECT from_status, to_status,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days)::numeric AS median_days, COUNT(*)::bigint AS count
          FROM all_durations GROUP BY from_status, to_status
          ORDER BY CASE from_status WHEN 'Draft' THEN 1 WHEN 'Review' THEN 2 WHEN 'Last Call' THEN 3 ELSE 4 END,
            CASE to_status WHEN 'Review' THEN 1 WHEN 'Last Call' THEN 2 WHEN 'Final' THEN 3 WHEN 'Withdrawn' THEN 4 ELSE 5 END`,
          repo
        ),
        prisma.$queryRawUnsafe<Array<{ month: string; count: bigint }>>(
          `SELECT TO_CHAR(date_trunc('month', se.changed_at), 'Mon') as month, COUNT(*)::bigint as count
          FROM eip_status_events se LEFT JOIN repositories r ON se.repository_id = r.id
          WHERE se.changed_at >= date_trunc('month', NOW() - INTERVAL '11 months')
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          GROUP BY date_trunc('month', se.changed_at) ORDER BY date_trunc('month', se.changed_at) ASC`,
          repo
        ),
        prisma.$queryRawUnsafe<Array<{ number: string; title: string; author: string; status: string; days: number }>>(
          `SELECT pr.pr_number::text as number, pr.title, pr.author,
            CASE WHEN pr.merged_at IS NOT NULL THEN 'merged' ELSE 'open' END as status,
            EXTRACT(DAY FROM (NOW() - pr.created_at))::int as days
          FROM pull_requests pr JOIN repositories r ON pr.repository_id = r.id
          WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          ORDER BY pr.created_at DESC LIMIT $2`,
          repo,
          input.recentPRsLimit
        ),
        prisma.$queryRawUnsafe<Array<{ eip: string; eip_type: string; title: string; deadline: string; daysRemaining: number; category: string | null; repository: string }>>(
          `SELECT e.eip_number::text as eip,
            CASE WHEN s.category = 'ERC' THEN 'ERC' WHEN r.name LIKE '%RIPs%' THEN 'RIP' ELSE 'EIP' END as eip_type,
            e.title, s.deadline::text as deadline,
            EXTRACT(DAY FROM (s.deadline - NOW()))::int as "daysRemaining", s.category, r.name as repository
          FROM eip_snapshots s JOIN eips e ON s.eip_id = e.id LEFT JOIN repositories r ON s.repository_id = r.id
          WHERE s.status = 'Last Call'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          ORDER BY s.deadline ASC`,
          repo
        ),
      ]);

      const apRow = activeProposalsRes[0];
      const transitions = decisionVelocityRes.map(r => ({
        from: r.from_status,
        to: r.to_status,
        medianDays: r.median_days != null ? Math.round(Number(r.median_days)) : null,
        count: Number(r.count),
      }));
      const draftToFinal = transitions.find(t => t.from === 'Draft' && t.to === 'Final');
      const draftToFinalMedian = draftToFinal?.medianDays ?? 0;
      const previousYearPlaceholder = draftToFinalMedian > 0 ? draftToFinalMedian + 42 : 0;

      return {
        activeProposals: {
          total: Number(apRow?.total ?? 0),
          draft: Number(apRow?.draft ?? 0),
          review: Number(apRow?.review ?? 0),
          lastCall: Number(apRow?.last_call ?? 0),
        },
        lifecycleData: lifecycleRes,
        standardsComposition: standardsRes,
        recentChanges: recentChangesRes.map(r => ({
          eip: r.eip,
          eip_type: r.eip_type,
          title: r.title,
          from: r.from,
          to: r.to,
          days: r.days,
          statusColor: r.statusColor,
          repository: r.repository,
          changed_at: r.changed_at,
        })),
        decisionVelocity: {
          transitions,
          draftToFinalMedian,
          previousYearPlaceholder,
          change: previousYearPlaceholder > 0 ? Math.round((-15 * draftToFinalMedian) / previousYearPlaceholder) : 0,
        },
        momentumData: momentumRes.map(r => Number(r.count)),
        recentPRs: recentPRsRes.map(r => ({
          number: r.number,
          title: r.title,
          author: r.author,
          status: r.status,
          days: r.days,
        })),
        lastCallWatchlist: lastCallRes.map(r => ({
          eip: r.eip,
          eip_type: r.eip_type,
          title: r.title,
          deadline: r.deadline,
          daysRemaining: r.daysRemaining,
          category: r.category,
          repository: r.repository,
        })),
      };
    }),

  /** Batch: timeline by category, timeline by status */
  getGovernanceTimelineData: os
    .$context<Ctx>()
    .input(z.object({ includeRIPs: z.boolean().optional().default(true) }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const includeRIPs = input.includeRIPs ?? true;

      try {
      const [categoryRes, statusRes] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ year: number | null; category: string; count: bigint }>>(
          `WITH CombinedProposals AS (
            SELECT EXTRACT(YEAR FROM e.created_at)::int as year,
              CASE WHEN s.category IS NOT NULL AND s.category != '' THEN s.category
                WHEN s.type = 'Meta' THEN 'Meta' WHEN s.type = 'Informational' THEN 'Informational' ELSE 'Core' END as dimension
            FROM eips e JOIN eip_snapshots s ON e.id = s.eip_id WHERE e.created_at IS NOT NULL
            UNION ALL
            SELECT EXTRACT(YEAR FROM created_at)::int as year, 'RIP' as dimension FROM rips WHERE created_at IS NOT NULL ${!includeRIPs ? 'AND 1=0' : ''}
          )
          SELECT year, dimension as category, COUNT(*) as count FROM CombinedProposals GROUP BY year, dimension ORDER BY year ASC, count DESC`
        ),
        prisma.$queryRawUnsafe<Array<{ year: number | null; status: string; count: bigint }>>(
          `WITH CombinedProposals AS (
            SELECT EXTRACT(YEAR FROM e.created_at)::int as year, s.status as dimension
            FROM eips e JOIN eip_snapshots s ON e.id = s.eip_id WHERE e.created_at IS NOT NULL
            UNION ALL
            SELECT EXTRACT(YEAR FROM created_at)::int as year, status as dimension FROM rips WHERE created_at IS NOT NULL ${!includeRIPs ? 'AND 1=0' : ''}
          )
          SELECT year, dimension as status, COUNT(*) as count FROM CombinedProposals GROUP BY year, dimension ORDER BY year ASC, count DESC`
        ),
      ]);

      const buildTimeline = (rows: Array<{ year: number | null; [k: string]: unknown; count: bigint }>, key: string) => {
        const map = new Map<number, { year: number; total: number; breakdown: Array<{ key: string; count: number }> }>();
        for (const row of rows) {
          const year = row.year;
          if (year == null) continue;
          if (!map.has(year)) map.set(year, { year, total: 0, breakdown: [] });
          const entry = map.get(year)!;
          const count = Number(row.count);
          entry.total += count;
          entry.breakdown.push({ key: String(row[key]), count });
        }
        return Array.from(map.values()).sort((a, b) => a.year - b.year);
      };

      return {
        timelineByCategory: buildTimeline(categoryRes, 'category'),
        timelineByStatus: buildTimeline(statusRes, 'status'),
      };
      } catch (err) {
        console.error('[getGovernanceTimelineData]', err);
        throw err;
      }
    }),
}
