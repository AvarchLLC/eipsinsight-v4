import { optionalAuthProcedure, type Ctx } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

const repoFilterSchema = z.object({
  repo: z.enum(['eips', 'ercs', 'rips']).optional(),
})
const repoTimeFilterSchema = z.object({
  repo: z.enum(['eips', 'ercs', 'rips']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

// Helper: resolve repo filter to repository IDs (avoids SPLIT_PART in every query)
async function getRepoIds(repo?: string): Promise<number[] | null> {
  if (!repo) return null;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    `SELECT id
     FROM repositories
     WHERE LOWER(SPLIT_PART(name, '/', 2)) = LOWER($1)`,
    repo
  );
  return rows.map((r) => r.id);
}

export const insightsProcedures = {
  // ──── 1) Monthly Status Snapshot ────
  // Uses eip_snapshots (current state — fast) + monthly transition counts for delta
  getMonthlyStatusSnapshot: optionalAuthProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      const repoIds = await getRepoIds(input.repo);
      const monthStart = `${input.month}-01`;
      const [y, m] = input.month.split('-').map(Number);
      const monthEnd = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);

      const currentCounts = await prisma.$queryRawUnsafe<Array<{
        status: string;
        repo_key: string;
        count: bigint;
      }>>(
        `SELECT
          s.status,
          COALESCE(LOWER(SPLIT_PART(r.name, '/', 2)), 'unknown') AS repo_key,
          COUNT(*)::bigint AS count
        FROM eip_snapshots s
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ($1::int[] IS NULL OR s.repository_id = ANY($1))
        GROUP BY s.status, COALESCE(LOWER(SPLIT_PART(r.name, '/', 2)), 'unknown')`,
        repoIds
      );

      const getPostBoundaryAdjustments = async (boundary: string) => {
        return prisma.$queryRawUnsafe<Array<{
          status: string;
          repo_key: string;
          arrivals: bigint;
          departures: bigint;
        }>>(
          `SELECT
             x.status,
             x.repo_key,
             SUM(x.arrivals)::bigint AS arrivals,
             SUM(x.departures)::bigint AS departures
           FROM (
             SELECT
               e.to_status AS status,
               COALESCE(LOWER(SPLIT_PART(r.name, '/', 2)), 'unknown') AS repo_key,
               COUNT(*)::bigint AS arrivals,
               0::bigint AS departures
             FROM eip_status_events e
             LEFT JOIN repositories r ON e.repository_id = r.id
             WHERE e.changed_at >= $1::date
               AND ($2::int[] IS NULL OR e.repository_id = ANY($2))
             GROUP BY e.to_status, COALESCE(LOWER(SPLIT_PART(r.name, '/', 2)), 'unknown')

             UNION ALL

             SELECT
               e.from_status AS status,
               COALESCE(LOWER(SPLIT_PART(r.name, '/', 2)), 'unknown') AS repo_key,
               0::bigint AS arrivals,
               COUNT(*)::bigint AS departures
             FROM eip_status_events e
             LEFT JOIN repositories r ON e.repository_id = r.id
             WHERE e.changed_at >= $1::date
               AND ($2::int[] IS NULL OR e.repository_id = ANY($2))
             GROUP BY e.from_status, COALESCE(LOWER(SPLIT_PART(r.name, '/', 2)), 'unknown')
           ) x
           GROUP BY x.status, x.repo_key`,
          boundary,
          repoIds
        );
      };

      const [postMonthEnd, postMonthStart] = await Promise.all([
        getPostBoundaryAdjustments(monthEnd),
        getPostBoundaryAdjustments(monthStart),
      ]);

      const currentMap = new Map<string, number>();
      for (const row of currentCounts) {
        currentMap.set(`${row.repo_key}::${row.status}`, Number(row.count));
      }

      const buildAdjustmentMap = (rows: Array<{ status: string; repo_key: string; arrivals: bigint; departures: bigint }>) => {
        const map = new Map<string, { arrivals: number; departures: number }>();
        for (const row of rows) {
          map.set(`${row.repo_key}::${row.status}`, {
            arrivals: Number(row.arrivals),
            departures: Number(row.departures),
          });
        }
        return map;
      };

      const afterEndMap = buildAdjustmentMap(postMonthEnd);
      const afterStartMap = buildAdjustmentMap(postMonthStart);

      const keys = new Set<string>([
        ...currentMap.keys(),
        ...afterEndMap.keys(),
        ...afterStartMap.keys(),
      ]);

      return Array.from(keys).map((key) => {
        const [repo, status] = key.split('::');
        const current = currentMap.get(key) ?? 0;
        const afterEnd = afterEndMap.get(key) ?? { arrivals: 0, departures: 0 };
        const afterStart = afterStartMap.get(key) ?? { arrivals: 0, departures: 0 };

        // Reverse transitions after boundary to reconstruct historical snapshot.
        const monthEndCount = current + afterEnd.departures - afterEnd.arrivals;
        const prevMonthEndCount = current + afterStart.departures - afterStart.arrivals;
        const safeMonthEndCount = Math.max(0, monthEndCount);
        const safePrevMonthEndCount = Math.max(0, prevMonthEndCount);

        return {
          status,
          repo,
          count: safeMonthEndCount,
          prevCount: safePrevMonthEndCount,
          delta: safeMonthEndCount - safePrevMonthEndCount,
        };
      });
    }),

  // ──── 2) Status Flow Over Time (stacked area) ────
  // Counts transition events per month (last 24 months for speed)
  getStatusFlowOverTime: optionalAuthProcedure
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {const repoIds = await getRepoIds(input.repo);

      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        status: string;
        count: bigint;
      }>>(
        `SELECT
          TO_CHAR(date_trunc('month', e.changed_at), 'YYYY-MM') AS month,
          e.to_status AS status,
          COUNT(*)::bigint AS count
        FROM eip_status_events e
        WHERE e.changed_at >= (NOW() - INTERVAL '24 months')
          AND ($1::int[] IS NULL OR e.repository_id = ANY($1))
        GROUP BY 1, 2
        ORDER BY 1, 2`,
        repoIds
      );

      return results.map((r) => ({
        month: r.month,
        status: r.status,
        count: Number(r.count),
      }));
    }),

  // ──── 3) Deadline Volatility ────
  getDeadlineVolatility: optionalAuthProcedure
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {const repoIds = await getRepoIds(input.repo);

      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        changes: bigint;
      }>>(
        `SELECT
          TO_CHAR(date_trunc('month', d.changed_at), 'YYYY-MM') AS month,
          COUNT(*)::bigint AS changes
        FROM eip_deadline_events d
        WHERE ($1::int[] IS NULL OR d.repository_id = ANY($1))
        GROUP BY 1
        ORDER BY 1`,
        repoIds
      );

      return results.map((r) => ({
        month: r.month,
        changes: Number(r.changes),
      }));
    }),

  // ──── 4) Editors Leaderboard ────
  getEditorsLeaderboard: optionalAuthProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {const repoIds = await getRepoIds(input.repo);

      const monthStart = input.month ? `${input.month}-01T00:00:00.000Z` : null;
      const monthEnd = input.month ? (() => {
        const [y, m] = input.month!.split('-').map(Number);
        return new Date(Date.UTC(y, m, 1)).toISOString();
      })() : null;

      const results = await prisma.$queryRawUnsafe<Array<{
        editor: string;
        reviews: bigint;
        prs_touched: bigint;
        comments: bigint;
      }>>(
        `SELECT
          ca.actor AS editor,
          COUNT(*) FILTER (WHERE ca.action_type = 'reviewed')::bigint AS reviews,
          COUNT(DISTINCT ca.pr_number)::bigint AS prs_touched,
          COUNT(*) FILTER (WHERE ca.action_type IN ('commented', 'issue_comment'))::bigint AS comments
        FROM contributor_activity ca
        WHERE ca.role = 'EDITOR'
          AND ($1::timestamptz IS NULL OR ca.occurred_at >= $1::timestamptz)
          AND ($2::timestamptz IS NULL OR ca.occurred_at < $2::timestamptz)
          AND ($3::int[] IS NULL OR ca.repository_id = ANY($3))
          AND ca.action_type IN ('reviewed', 'commented', 'issue_comment')
        GROUP BY ca.actor
        ORDER BY reviews DESC
        LIMIT 20`,
        monthStart,
        monthEnd,
        repoIds
      );

      return results.map((r) => ({
        editor: r.editor,
        reviews: Number(r.reviews),
        prsTouched: Number(r.prs_touched),
        comments: Number(r.comments),
      }));
    }),

  getEditorsLeaderboardDetailedExport: optionalAuthProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ input }) => {
      const repoIds = await getRepoIds(input.repo);
      const monthStart = `${input.month}-01T00:00:00.000Z`;
      const [y, m] = input.month.split('-').map(Number);
      const monthEnd = new Date(Date.UTC(y, m, 1)).toISOString();

      const detailRows = await prisma.$queryRawUnsafe<Array<{
        editor: string;
        pr_number: number;
        repo_name: string | null;
        occurred_at: string;
        action_type: string;
      }>>(
        `SELECT
          ca.actor AS editor,
          ca.pr_number,
          r.name AS repo_name,
          TO_CHAR(ca.occurred_at, 'YYYY-MM-DD HH24:MI:SS') AS occurred_at,
          ca.action_type
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE ca.role = 'EDITOR'
          AND ca.occurred_at >= $1::timestamptz
          AND ca.occurred_at < $2::timestamptz
          AND ($3::int[] IS NULL OR ca.repository_id = ANY($3))
          AND ca.action_type IN ('reviewed', 'commented', 'issue_comment')
        ORDER BY ca.actor ASC, ca.occurred_at ASC
        LIMIT 50000`,
        monthStart,
        monthEnd,
        repoIds
      );

      const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const detailCsv = [
        'Editor,PR Number,PR Link,Occurred At,Action Type',
        ...detailRows.map((r) => {
          const prLink = r.repo_name
            ? `https://github.com/${r.repo_name}/pull/${r.pr_number}`
            : '';
          return [r.editor, r.pr_number, prLink, r.occurred_at, r.action_type].map(escape).join(',');
        }),
      ];

      return {
        csv: detailCsv.join('\n'),
        filename: `editors-leaderboard-detailed-${input.repo ?? 'all'}-${input.month}.csv`,
      };
    }),

  // ──── 5) Open PRs ────
  getOpenPRs: optionalAuthProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {const repoIds = await getRepoIds(input.repo);

      const results = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        title: string | null;
        author: string | null;
        state: string | null;
        repo_name: string;
        governance_state: string | null;
        waiting_since: string | null;
        days_waiting: number | null;
        created_at: string | null;
      }>>(
        `SELECT
          p.pr_number,
          p.title,
          p.author,
          p.state,
          COALESCE(r.name, 'unknown') AS repo_name,
          g.current_state AS governance_state,
          TO_CHAR(g.waiting_since, 'YYYY-MM-DD') AS waiting_since,
          EXTRACT(DAY FROM (NOW() - COALESCE(g.waiting_since, p.updated_at)))::int AS days_waiting,
          TO_CHAR(p.created_at, 'YYYY-MM-DD') AS created_at
        FROM pull_requests p
        LEFT JOIN repositories r ON p.repository_id = r.id
        LEFT JOIN pr_governance_state g ON g.pr_number = p.pr_number AND g.repository_id = p.repository_id
        WHERE p.state = 'open'
          AND ($1::int[] IS NULL OR p.repository_id = ANY($1))
        ORDER BY days_waiting DESC NULLS LAST
        LIMIT $2`,
        repoIds,
        input.limit ?? 50
      );

      return results.map((r) => ({
        prNumber: r.pr_number,
        title: r.title,
        author: r.author,
        state: r.state,
        repo: r.repo_name,
        governanceState: r.governance_state,
        waitingSince: r.waiting_since,
        daysWaiting: r.days_waiting ?? 0,
        createdAt: r.created_at,
      }));
    }),

  // ──── 6) PR Lifecycle Funnel ────
  getPRLifecycleFunnel: optionalAuthProcedure
    .input(repoTimeFilterSchema)
    .handler(async ({ context, input }) => {const repoIds = await getRepoIds(input.repo);

      const results = await prisma.$queryRawUnsafe<Array<{
        total_opened: bigint;
        has_review: bigint;
        merged: bigint;
        closed_unmerged: bigint;
      }>>(
        `SELECT
          COUNT(*)::bigint AS total_opened,
          COUNT(*) FILTER (WHERE p.num_reviews > 0)::bigint AS has_review,
          COUNT(*) FILTER (WHERE p.merged_at IS NOT NULL)::bigint AS merged,
          COUNT(*) FILTER (WHERE p.state = 'closed' AND p.merged_at IS NULL)::bigint AS closed_unmerged
        FROM pull_requests p
        WHERE ($1::int[] IS NULL OR p.repository_id = ANY($1))
          AND ($2::timestamptz IS NULL OR p.created_at >= $2::timestamptz)
          AND ($3::timestamptz IS NULL OR p.created_at < $3::timestamptz)`,
        repoIds,
        input.from ?? null,
        input.to ?? null
      );

      const row = results[0];
      return {
        opened: Number(row?.total_opened ?? 0),
        reviewed: Number(row?.has_review ?? 0),
        merged: Number(row?.merged ?? 0),
        closedUnmerged: Number(row?.closed_unmerged ?? 0),
      };
    }),

  // ──── 7) Governance State Distribution ────
  getGovernanceStatesOverTime: optionalAuthProcedure
    .input(repoTimeFilterSchema)
    .handler(async ({ context, input }) => {const repoIds = await getRepoIds(input.repo);

      const results = await prisma.$queryRawUnsafe<Array<{
        current_state: string;
        count: bigint;
      }>>(
        `SELECT
          g.current_state,
          COUNT(*)::bigint AS count
        FROM pr_governance_state g
        WHERE ($1::int[] IS NULL OR g.repository_id = ANY($1))
          AND ($2::timestamptz IS NULL OR g.updated_at >= $2::timestamptz)
          AND ($3::timestamptz IS NULL OR g.updated_at < $3::timestamptz)
        GROUP BY g.current_state
        ORDER BY count DESC`,
        repoIds,
        input.from ?? null,
        input.to ?? null
      );

      return results.map((r) => ({
        state: r.current_state,
        count: Number(r.count),
      }));
    }),

  // ──── 8) Time-to-Decision ────
  getTimeToDecision: optionalAuthProcedure
    .input(repoTimeFilterSchema)
    .handler(async ({ context, input }) => {const repoIds = await getRepoIds(input.repo);

      const results = await prisma.$queryRawUnsafe<Array<{
        repo_type: string;
        outcome: string;
        median_days: number;
        avg_days: number;
        count: bigint;
      }>>(
        `SELECT
          COALESCE(LOWER(r.type), 'unknown') AS repo_type,
          CASE WHEN p.merged_at IS NOT NULL THEN 'merged' ELSE 'closed' END AS outcome,
          PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (COALESCE(p.merged_at, p.closed_at) - p.created_at)) / 86400
          )::numeric(10,1) AS median_days,
          AVG(EXTRACT(EPOCH FROM (COALESCE(p.merged_at, p.closed_at) - p.created_at)) / 86400)::numeric(10,1) AS avg_days,
          COUNT(*)::bigint AS count
        FROM pull_requests p
        LEFT JOIN repositories r ON p.repository_id = r.id
        WHERE (p.merged_at IS NOT NULL OR p.closed_at IS NOT NULL)
          AND p.created_at IS NOT NULL
          AND ($1::int[] IS NULL OR p.repository_id = ANY($1))
          AND ($2::timestamptz IS NULL OR COALESCE(p.merged_at, p.closed_at) >= $2::timestamptz)
          AND ($3::timestamptz IS NULL OR COALESCE(p.merged_at, p.closed_at) < $3::timestamptz)
        GROUP BY 1, 2
        ORDER BY 1, 2`,
        repoIds,
        input.from ?? null,
        input.to ?? null
      );

      return results.map((r) => ({
        repo: r.repo_type || 'unknown',
        outcome: r.outcome,
        medianDays: Number(r.median_days),
        avgDays: Number(r.avg_days),
        count: Number(r.count),
      }));
    }),

  // ──── 9) Bottleneck Heatmap ────
  getBottleneckHeatmap: optionalAuthProcedure
    .input(repoTimeFilterSchema)
    .handler(async ({ context, input }) => {const repoIds = await getRepoIds(input.repo);

      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        state: string;
        count: bigint;
      }>>(
        `SELECT
          TO_CHAR(date_trunc('month', g.updated_at), 'YYYY-MM') AS month,
          g.current_state AS state,
          COUNT(*)::bigint AS count
        FROM pr_governance_state g
        WHERE g.updated_at IS NOT NULL
          AND ($1::int[] IS NULL OR g.repository_id = ANY($1))
          AND ($2::timestamptz IS NULL OR g.updated_at >= $2::timestamptz)
          AND ($3::timestamptz IS NULL OR g.updated_at < $3::timestamptz)
        GROUP BY 1, 2
        ORDER BY 1 DESC, 3 DESC
        LIMIT 200`,
        repoIds,
        input.from ?? null,
        input.to ?? null
      );

      return results.map((r) => ({
        month: r.month,
        state: r.state,
        count: Number(r.count),
      }));
    }),

  // ──── 10) Upgrade Timeline ────
  getUpgradeTimeline: optionalAuthProcedure
    .handler(async ({ context }) => {const results = await prisma.$queryRawUnsafe<Array<{
        id: number;
        slug: string;
        name: string | null;
        meta_eip: number | null;
        eip_count: bigint;
        created_at: string | null;
      }>>(
        `SELECT
          u.id,
          u.slug,
          u.name,
          u.meta_eip,
          (SELECT COUNT(*) FROM upgrade_composition_current uc WHERE uc.upgrade_id = u.id)::bigint AS eip_count,
          TO_CHAR(u.created_at, 'YYYY-MM-DD') AS created_at
        FROM upgrades u
        ORDER BY u.created_at DESC NULLS LAST`
      );

      return results.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        metaEip: r.meta_eip,
        eipCount: Number(r.eip_count),
        createdAt: r.created_at,
      }));
    }),

  // ──── 11) Upgrade Composition Changes ────
  getUpgradeCompositionChanges: optionalAuthProcedure
    .input(z.object({
      upgradeId: z.number().optional(),
    }))
    .handler(async ({ context, input }) => {const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        upgrade_name: string;
        event_type: string;
        count: bigint;
      }>>(
        `SELECT
          TO_CHAR(date_trunc('month', e.commit_date), 'YYYY-MM') AS month,
          COALESCE(u.name, u.slug) AS upgrade_name,
          e.event_type,
          COUNT(*)::bigint AS count
        FROM upgrade_composition_events e
        JOIN upgrades u ON e.upgrade_id = u.id
        WHERE e.commit_date IS NOT NULL
          AND ($1::int IS NULL OR e.upgrade_id = $1)
        GROUP BY 1, 2, 3
        ORDER BY 1`,
        input.upgradeId ?? null
      );

      return results.map((r) => ({
        month: r.month,
        upgrade: r.upgrade_name,
        eventType: r.event_type,
        count: Number(r.count),
      }));
    }),

  // ──── 12) EIP Progress Timeline (editorial) ────
  getEIPTimeline: optionalAuthProcedure
    .input(z.object({
      eipNumber: z.number(),
    }))
    .handler(async ({ context, input }) => {// Sequential queries to avoid connection pool pressure
      const snapshot = await prisma.$queryRawUnsafe<Array<{
        status: string;
        type: string | null;
        category: string | null;
        deadline: Date | null;
        updated_at: Date;
        title: string | null;
        author: string | null;
        created_at: Date | null;
      }>>(
        `SELECT s.status, s.type, s.category, s.deadline, s.updated_at,
                ei.title, ei.author, ei.created_at
         FROM eip_snapshots s
         JOIN eips ei ON s.eip_id = ei.id
         WHERE ei.eip_number = $1`,
        input.eipNumber
      );

      const statusEvents = await prisma.$queryRawUnsafe<Array<{
        from_status: string | null;
        to_status: string;
        changed_at: Date;
        pr_number: number | null;
      }>>(
        `SELECT e.from_status, e.to_status, e.changed_at, e.pr_number
         FROM eip_status_events e
         JOIN eips ei ON e.eip_id = ei.id
         WHERE ei.eip_number = $1
         ORDER BY e.changed_at ASC`,
        input.eipNumber
      );

      const categoryEvents = await prisma.$queryRawUnsafe<Array<{
        from_category: string | null;
        to_category: string;
        changed_at: Date;
      }>>(
        `SELECT e.from_category, e.to_category, e.changed_at
         FROM eip_category_events e
         JOIN eips ei ON e.eip_id = ei.id
         WHERE ei.eip_number = $1
         ORDER BY e.changed_at ASC`,
        input.eipNumber
      );

      const typeEvents = await prisma.$queryRawUnsafe<Array<{
        from_type: string | null;
        to_type: string;
        changed_at: Date;
      }>>(
        `SELECT e.from_type, e.to_type, e.changed_at
         FROM eip_type_events e
         JOIN eips ei ON e.eip_id = ei.id
         WHERE ei.eip_number = $1
         ORDER BY e.changed_at ASC`,
        input.eipNumber
      );

      const deadlineEvents = await prisma.$queryRawUnsafe<Array<{
        previous_deadline: Date | null;
        new_deadline: Date | null;
        changed_at: Date;
      }>>(
        `SELECT d.previous_deadline, d.new_deadline, d.changed_at
         FROM eip_deadline_events d
         JOIN eips ei ON d.eip_id = ei.id
         WHERE ei.eip_number = $1
         ORDER BY d.changed_at ASC`,
        input.eipNumber
      );

      const linkedPRs = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        title: string | null;
        author: string | null;
        state: string | null;
        merged_at: Date | null;
        num_comments: number | null;
        num_reviews: number | null;
        num_commits: number | null;
        num_files: number | null;
        num_participants: number | null;
        created_at: Date | null;
        repository_name: string | null;
      }>>(
        `SELECT p.pr_number, p.title, p.author, p.state,
                p.merged_at,
                p.num_comments, p.num_reviews, p.num_commits, p.num_files,
                p.num_participants, p.created_at, r.name AS repository_name
         FROM pull_requests p
         JOIN pull_request_eips pre ON pre.pr_number = p.pr_number AND pre.repository_id = p.repository_id
         LEFT JOIN repositories r ON r.id = p.repository_id
         WHERE pre.eip_number = $1
         ORDER BY p.created_at ASC`,
        input.eipNumber
      );

      const upgrades = await prisma.$queryRawUnsafe<Array<{
        slug: string;
        name: string | null;
        bucket: string | null;
      }>>(
        `SELECT u.slug, u.name, ucc.bucket
         FROM upgrade_composition_current ucc
         JOIN upgrades u ON u.id = ucc.upgrade_id
         WHERE ucc.eip_number = $1
         ORDER BY u.created_at DESC NULLS LAST`,
        input.eipNumber
      );

      const statusTransitionPrSet = new Set(
        statusEvents
          .map((e) => e.pr_number)
          .filter((n): n is number => n != null)
      );

      const snap = snapshot[0] ?? null;

      return {
        eipNumber: input.eipNumber,
        title: snap?.title ?? null,
        author: snap?.author ?? null,
        createdAt: snap?.created_at ? snap.created_at.toISOString() : null,
        currentStatus: snap?.status ?? null,
        currentType: snap?.type ?? null,
        currentCategory: snap?.category ?? null,
        deadline: snap?.deadline ? snap.deadline.toISOString() : null,
        lastUpdated: snap?.updated_at ? snap.updated_at.toISOString() : null,
        statusEvents: statusEvents.map((e) => ({
          from: e.from_status,
          to: e.to_status,
          date: e.changed_at.toISOString(),
          prNumber: e.pr_number,
        })),
        categoryEvents: categoryEvents.map((e) => ({
          from: e.from_category,
          to: e.to_category,
          date: e.changed_at.toISOString(),
        })),
        typeEvents: typeEvents.map((e) => ({
          from: e.from_type,
          to: e.to_type,
          date: e.changed_at.toISOString(),
        })),
        deadlineEvents: deadlineEvents.map((e) => ({
          previous: e.previous_deadline ? e.previous_deadline.toISOString() : null,
          newDeadline: e.new_deadline ? e.new_deadline.toISOString() : null,
          date: e.changed_at.toISOString(),
        })),
        linkedPRs: linkedPRs.map((p) => ({
          prNumber: p.pr_number,
          title: p.title,
          author: p.author,
          state: p.state,
          mergedAt: p.merged_at ? p.merged_at.toISOString() : null,
          comments: p.num_comments ?? 0,
          reviews: p.num_reviews ?? 0,
          commits: p.num_commits ?? 0,
          files: p.num_files ?? 0,
          participants: p.num_participants ?? 0,
          createdAt: p.created_at ? p.created_at.toISOString() : null,
          repositoryName: p.repository_name,
          classification: statusTransitionPrSet.has(p.pr_number)
            ? "Status Transition PR"
            : (p.num_files ?? 0) <= 2
              ? "Editorial"
              : "Spec Change",
        })),
        upgrades: upgrades.map((u) => ({
          slug: u.slug,
          name: u.name ?? u.slug,
          bucket: u.bucket,
        })),
      };
    }),

  // ──── 13) Monthly Drilldown (forensic table) ────
  getMonthlyDrilldown: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all'),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      status: z.array(z.string()).optional().default([]),
      type: z.array(z.string()).optional().default([]),
      change: z.array(z.enum(['status-change', 'content-change', 'metadata-change'])).optional().default([]),
      q: z.string().optional().default(''),
      sort: z.enum(['impact_desc', 'updated_desc', 'status_first', 'prs_desc']).optional().default('impact_desc'),
      page: z.number().int().min(1).optional().default(1),
      pageSize: z.number().int().min(1).max(2000).optional().default(25),
    }))
    .handler(async ({ input }) => {
      const repoKey = input.repo === 'all' ? undefined : input.repo;
      const repoIds = await getRepoIds(repoKey);
      const monthStart = `${input.month}-01`;
      const [year, mon] = input.month.split('-').map(Number);
      const monthEnd = new Date(Date.UTC(year, mon, 1)).toISOString().slice(0, 10);

      const coreRows = await prisma.$queryRawUnsafe<Array<{
        eip_id: number;
        eip_number: number;
        title: string | null;
        author: string | null;
        created_at: Date | null;
        status: string;
        status_at_month: string | null;
        type: string | null;
        category: string | null;
        updated_at: Date;
        repo_name: string | null;
        repo_short: string | null;
      }>>(
        `
        SELECT
          e.id AS eip_id,
          e.eip_number,
          e.title,
          e.author,
          e.created_at,
          s.status,
          sm.status_at_month,
          s.type,
          s.category,
          s.updated_at,
          r.name AS repo_name,
          LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short
        FROM eips e
        JOIN eip_snapshots s ON s.eip_id = e.id
        LEFT JOIN repositories r ON r.id = s.repository_id
        LEFT JOIN LATERAL (
          SELECT se.to_status AS status_at_month
          FROM eip_status_events se
          WHERE se.eip_id = e.id
            AND se.changed_at < $2::date
            AND ($1::int[] IS NULL OR se.repository_id = ANY($1))
          ORDER BY se.changed_at DESC
          LIMIT 1
        ) sm ON TRUE
        WHERE ($1::int[] IS NULL OR s.repository_id = ANY($1))
        `,
        repoIds,
        monthEnd
      );

      const statusChangeRows = await prisma.$queryRawUnsafe<Array<{
        eip_id: number;
        status_changed_at: Date;
        status_from: string | null;
        status_to: string;
        transition_count: bigint;
      }>>(
        `
        SELECT
          se.eip_id,
          MAX(se.changed_at) AS status_changed_at,
          (ARRAY_AGG(se.from_status ORDER BY se.changed_at DESC))[1] AS status_from,
          (ARRAY_AGG(se.to_status ORDER BY se.changed_at DESC))[1] AS status_to,
          COUNT(*)::bigint AS transition_count
        FROM eip_status_events se
        WHERE se.changed_at >= $1::date
          AND se.changed_at < $2::date
          AND ($3::int[] IS NULL OR se.repository_id = ANY($3))
        GROUP BY se.eip_id
        `,
        monthStart,
        monthEnd,
        repoIds
      );

      const contentRows = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        primary_pr_number: number | null;
        primary_pr_title: string | null;
        primary_pr_merged_at: Date | null;
        all_pr_numbers: number[] | null;
        linked_pr_count: bigint;
        commits: bigint;
        files_changed: bigint;
        discussion_volume: bigint;
      }>>(
        `
        SELECT
          pre.eip_number,
          (ARRAY_AGG(p.pr_number ORDER BY p.merged_at DESC NULLS LAST))[1] AS primary_pr_number,
          (ARRAY_AGG(p.title ORDER BY p.merged_at DESC NULLS LAST))[1] AS primary_pr_title,
          MAX(p.merged_at) AS primary_pr_merged_at,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.pr_number), NULL) AS all_pr_numbers,
          COUNT(DISTINCT p.pr_number)::bigint AS linked_pr_count,
          COALESCE(SUM(COALESCE(p.num_commits, 0)), 0)::bigint AS commits,
          COALESCE(SUM(COALESCE(p.num_files, 0)), 0)::bigint AS files_changed,
          COALESCE(SUM(COALESCE(p.num_comments, 0)), 0)::bigint AS discussion_volume
        FROM pull_request_eips pre
        JOIN pull_requests p ON p.pr_number = pre.pr_number AND p.repository_id = pre.repository_id
        WHERE p.merged_at >= $1::date
          AND p.merged_at < $2::date
          AND ($3::int[] IS NULL OR p.repository_id = ANY($3))
        GROUP BY pre.eip_number
        `,
        monthStart,
        monthEnd,
        repoIds
      );

      const metadataRows = await prisma.$queryRawUnsafe<Array<{
        eip_id: number;
        metadata_changed_at: Date;
        metadata_events: bigint;
      }>>(
        `
        SELECT
          x.eip_id,
          MAX(x.changed_at) AS metadata_changed_at,
          COUNT(*)::bigint AS metadata_events
        FROM (
          SELECT ce.eip_id, ce.changed_at
          FROM eip_category_events ce
          WHERE ce.changed_at >= $1::date
            AND ce.changed_at < $2::date
            AND ($3::int[] IS NULL OR ce.repository_id = ANY($3))
          UNION ALL
          SELECT de.eip_id, de.changed_at
          FROM eip_deadline_events de
          WHERE de.changed_at >= $1::date
            AND de.changed_at < $2::date
            AND ($3::int[] IS NULL OR de.repository_id = ANY($3))
        ) x
        GROUP BY x.eip_id
        `,
        monthStart,
        monthEnd,
        repoIds
      );

      const upgradeRows = await prisma.$queryRawUnsafe<Array<{ eip_number: number; upgrade_name: string }>>(
        `
        SELECT
          ucc.eip_number,
          COALESCE(u.name, u.slug) AS upgrade_name
        FROM upgrade_composition_current ucc
        JOIN upgrades u ON u.id = ucc.upgrade_id
        `
      );

      const statusMap = new Map<number, {
        changedAt: Date;
        from: string | null;
        to: string;
        count: number;
      }>();
      for (const row of statusChangeRows) {
        statusMap.set(row.eip_id, {
          changedAt: row.status_changed_at,
          from: row.status_from,
          to: row.status_to,
          count: Number(row.transition_count),
        });
      }

      const contentMap = new Map<number, {
        primaryPrNumber: number | null;
        primaryPrTitle: string | null;
        primaryPrMergedAt: Date | null;
        allPrNumbers: number[];
        linkedPrCount: number;
        commits: number;
        filesChanged: number;
        discussionVolume: number;
      }>();
      for (const row of contentRows) {
        contentMap.set(row.eip_number, {
          primaryPrNumber: row.primary_pr_number,
          primaryPrTitle: row.primary_pr_title,
          primaryPrMergedAt: row.primary_pr_merged_at,
          allPrNumbers: row.all_pr_numbers ?? [],
          linkedPrCount: Number(row.linked_pr_count),
          commits: Number(row.commits),
          filesChanged: Number(row.files_changed),
          discussionVolume: Number(row.discussion_volume),
        });
      }

      const metadataMap = new Map<number, { changedAt: Date; events: number }>();
      for (const row of metadataRows) {
        metadataMap.set(row.eip_id, {
          changedAt: row.metadata_changed_at,
          events: Number(row.metadata_events),
        });
      }

      const upgradeMap = new Map<number, string[]>();
      for (const row of upgradeRows) {
        if (!upgradeMap.has(row.eip_number)) upgradeMap.set(row.eip_number, []);
        upgradeMap.get(row.eip_number)!.push(row.upgrade_name);
      }

      const rows = coreRows.map((core) => {
        const statusEvt = statusMap.get(core.eip_id);
        const contentEvt = contentMap.get(core.eip_number);
        const metadataEvt = metadataMap.get(core.eip_id);
        const metadataChanged = !!metadataEvt;

        const changedTypes: Array<'status-change' | 'content-change' | 'metadata-change'> = [];
        if (statusEvt) changedTypes.push('status-change');
        if (contentEvt) changedTypes.push('content-change');
        if (metadataChanged) changedTypes.push('metadata-change');

        const latestChangedAt = [statusEvt?.changedAt, contentEvt?.primaryPrMergedAt, metadataEvt?.changedAt]
          .filter((d): d is Date => !!d)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date(monthEnd);

        const statusTransition = statusEvt
          ? {
              from: statusEvt.from,
              to: statusEvt.to,
              changedAt: statusEvt.changedAt.toISOString(),
              count: statusEvt.count,
            }
          : null;

        const repoShort = (core.repo_short || 'eips').toLowerCase();
        const proposalKind = repoShort === 'ercs' ? 'ERC' : repoShort === 'rips' ? 'RIP' : 'EIP';
        const proposalUrl = proposalKind === 'ERC' ? `/erc/${core.eip_number}` : proposalKind === 'RIP' ? `/rip/${core.eip_number}` : `/eip/${core.eip_number}`;
        const primaryPrUrl = contentEvt?.primaryPrNumber != null
          ? `/pr/${repoShort}/${contentEvt.primaryPrNumber}`
          : null;

        const impactScore =
          (changedTypes.includes('status-change') ? 3 : 0) +
          (changedTypes.includes('content-change') ? 2 : 0) +
          (changedTypes.includes('metadata-change') ? 1 : 0) +
          (statusEvt?.count ?? 0) +
          (contentEvt?.linkedPrCount ?? 0);

        return {
          eipId: core.eip_id,
          proposalKind,
          number: core.eip_number,
          title: core.title,
          author: core.author,
          repo: repoShort,
          repoName: core.repo_name || null,
          currentStatus: core.status_at_month || core.status,
          type: core.type,
          category: core.category,
          createdAt: core.created_at?.toISOString() ?? null,
          updatedAt: core.updated_at.toISOString(),
          latestChangedAt: latestChangedAt.toISOString(),
          changedTypes,
          statusTransition,
          changeSummary: statusEvt
            ? `Status: ${statusEvt.from || 'Unknown'} -> ${statusEvt.to}`
            : contentEvt
              ? `Content updated via ${contentEvt.linkedPrCount} merged PR(s)`
              : `Metadata updated (${metadataEvt?.events || 1} event${(metadataEvt?.events || 1) > 1 ? 's' : ''})`,
          primaryPrNumber: contentEvt?.primaryPrNumber ?? null,
          primaryPrTitle: contentEvt?.primaryPrTitle ?? null,
          primaryPrMergedAt: contentEvt?.primaryPrMergedAt?.toISOString() ?? null,
          primaryPrUrl,
          allPrNumbers: contentEvt?.allPrNumbers ?? [],
          linkedPrCount: contentEvt?.linkedPrCount ?? 0,
          commits: contentEvt?.commits ?? 0,
          filesChanged: contentEvt?.filesChanged ?? 0,
          discussionVolume: contentEvt?.discussionVolume ?? 0,
          upgradeTags: upgradeMap.get(core.eip_number) ?? [],
          proposalUrl,
          impactScore,
        };
      });

      let filtered = rows.filter((r) => r.changedTypes.length > 0);

      if (input.status.length > 0) {
        const wanted = new Set(input.status.map((s) => s.toLowerCase()));
        filtered = filtered.filter((r) =>
          wanted.has((r.currentStatus || '').toLowerCase()) ||
          wanted.has((r.statusTransition?.to || '').toLowerCase())
        );
      }

      if (input.type.length > 0) {
        const wanted = new Set(input.type.map((t) => t.toLowerCase()));
        filtered = filtered.filter((r) =>
          wanted.has((r.type || '').toLowerCase()) || wanted.has((r.category || '').toLowerCase())
        );
      }

      if (input.change.length > 0) {
        const wanted = new Set(input.change);
        filtered = filtered.filter((r) => r.changedTypes.some((ct) => wanted.has(ct)));
      }

      const query = input.q.trim().toLowerCase();
      if (query) {
        filtered = filtered.filter((r) =>
          String(r.number).includes(query) ||
          (r.title || '').toLowerCase().includes(query) ||
          (r.author || '').toLowerCase().includes(query)
        );
      }

      if (input.sort === 'updated_desc') {
        filtered.sort((a, b) => b.latestChangedAt.localeCompare(a.latestChangedAt));
      } else if (input.sort === 'status_first') {
        filtered.sort((a, b) => {
          const as = a.changedTypes.includes('status-change') ? 1 : 0;
          const bs = b.changedTypes.includes('status-change') ? 1 : 0;
          if (as !== bs) return bs - as;
          return b.latestChangedAt.localeCompare(a.latestChangedAt);
        });
      } else if (input.sort === 'prs_desc') {
        filtered.sort((a, b) => (b.linkedPrCount - a.linkedPrCount) || b.latestChangedAt.localeCompare(a.latestChangedAt));
      } else {
        filtered.sort((a, b) => (b.impactScore - a.impactScore) || b.latestChangedAt.localeCompare(a.latestChangedAt));
      }

      const summary = {
        totalChanged: filtered.length,
        statusChanges: filtered.filter((r) => r.changedTypes.includes('status-change')).length,
        contentChanges: filtered.filter((r) => r.changedTypes.includes('content-change')).length,
        metadataChanges: filtered.filter((r) => r.changedTypes.includes('metadata-change')).length,
        topStatuses: Object.entries(filtered.reduce((acc, r) => {
          const key = r.statusTransition?.to || r.currentStatus || 'Unknown';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>))
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([status, count]) => ({ status, count })),
        transitions: Object.entries(filtered.reduce((acc, r) => {
          if (!r.statusTransition) return acc;
          const key = `${r.statusTransition.from || 'Unknown'}->${r.statusTransition.to || 'Unknown'}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>))
          .sort((a, b) => b[1] - a[1])
          .map(([transition, count]) => ({ transition, count })),
        statusBreakdown: Object.entries(filtered.reduce((acc, r) => {
          const key = r.currentStatus || 'Unknown';
          if (!acc[key]) acc[key] = { total: 0, transitionsIn: 0, contentTouched: 0 };
          acc[key].total += 1;
          if (r.statusTransition?.to === key) acc[key].transitionsIn += 1;
          if (r.changedTypes.includes('content-change')) acc[key].contentTouched += 1;
          return acc;
        }, {} as Record<string, { total: number; transitionsIn: number; contentTouched: number }>))
          .map(([status, values]) => ({ status, ...values }))
          .sort((a, b) => b.total - a.total),
      };

      const total = filtered.length;
      const page = input.page;
      const pageSize = input.pageSize;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      const paged = filtered.slice(start, start + pageSize);

      return {
        meta: {
          month: input.month,
          repo: input.repo,
          page,
          pageSize,
          total,
          totalPages,
          filtersApplied: {
            status: input.status,
            type: input.type,
            change: input.change,
            q: input.q,
            sort: input.sort,
          },
        },
        summary,
        rows: paged,
      };
    }),

  // ──── 14) Available months ────
  getSyncMeta: optionalAuthProcedure
    .handler(async () => {
      const completedRuns = await prisma.$queryRawUnsafe<Array<{
        started_at: Date;
        finished_at: Date | null;
      }>>(
        `SELECT started_at, finished_at
         FROM scheduler_runs
         WHERE finished_at IS NOT NULL
           AND status <> 'running'
         ORDER BY finished_at DESC
         LIMIT 20`
      );

      if (completedRuns.length === 0) {
        const latestAny = await prisma.$queryRawUnsafe<Array<{
          started_at: Date;
          finished_at: Date | null;
        }>>(
          `SELECT started_at, finished_at
           FROM scheduler_runs
           ORDER BY started_at DESC
           LIMIT 1`
        );

        const last = latestAny[0];
        if (!last) {
          return {
            lastSyncAt: null as string | null,
            nextUpdateAt: null as string | null,
            cadenceMinutes: null as number | null,
          };
        }

        const lastSync = last.finished_at ?? last.started_at;
        const fallbackCadenceMinutes = 6 * 60;
        const next = new Date(lastSync.getTime() + fallbackCadenceMinutes * 60 * 1000);
        return {
          lastSyncAt: lastSync.toISOString(),
          nextUpdateAt: next.toISOString(),
          cadenceMinutes: fallbackCadenceMinutes,
        };
      }

      const timestamps = completedRuns
        .map((r) => r.finished_at ?? r.started_at)
        .filter(Boolean)
        .sort((a, b) => b.getTime() - a.getTime());

      const diffsMinutes: number[] = [];
      for (let i = 0; i < timestamps.length - 1; i++) {
        const newer = timestamps[i].getTime();
        const older = timestamps[i + 1].getTime();
        const diff = Math.round((newer - older) / 60000);
        if (diff > 0 && diff <= 14 * 24 * 60) diffsMinutes.push(diff);
      }

      const fallbackCadenceMinutes = 6 * 60;
      const cadenceMinutes =
        diffsMinutes.length > 0
          ? diffsMinutes.sort((a, b) => a - b)[Math.floor(diffsMinutes.length / 2)]
          : fallbackCadenceMinutes;

      const lastSync = timestamps[0];
      const next = new Date(lastSync.getTime() + cadenceMinutes * 60 * 1000);

      return {
        lastSyncAt: lastSync.toISOString(),
        nextUpdateAt: next.toISOString(),
        cadenceMinutes,
      };
    }),

  // ──── 15) Status transition by month ────
  getStatusTransitionData: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .handler(async ({ context, input }): Promise<Array<Record<string, string | number>>> => {
      const repoIds = await getRepoIds(input.repo);
      
      const months = [input.month];
      
      if (months.length === 0) {
        return [];
      }

      // Get status counts for each month
      const statusByMonth = await prisma.$queryRawUnsafe<Array<{
        month: string;
        status: string;
        count: number;
      }>>(
        `WITH monthly_snapshots AS (
           SELECT
             TO_CHAR(date_trunc('month', s.updated_at), 'YYYY-MM') AS month,
             s.status,
             COUNT(*) OVER (
               PARTITION BY TO_CHAR(date_trunc('month', s.updated_at), 'YYYY-MM'), s.status
             ) AS cnt,
             ROW_NUMBER() OVER (
               PARTITION BY TO_CHAR(date_trunc('month', s.updated_at), 'YYYY-MM'), s.status
               ORDER BY s.updated_at DESC
             ) AS rn
           FROM eip_snapshots s
           LEFT JOIN repositories r ON s.repository_id = r.id
           WHERE ($1::int[] IS NULL OR s.repository_id = ANY($1))
             AND TO_CHAR(date_trunc('month', s.updated_at), 'YYYY-MM') = ANY($2::text[])
         )
         SELECT
           month,
           status,
           cnt AS count
         FROM monthly_snapshots
         WHERE rn = 1
         ORDER BY month, status`,
        repoIds,
        months
      );

      // Transform into the format needed by the chart
      const result: Array<Record<string, string | number>> = months.map(month => {
        const d = new Date(`${month}-01T00:00:00Z`);
        const monthName = d.toLocaleString("en-US", { month: "short", year: "numeric" });
        return { month: monthName };
      });

      // Map status counts into result
      for (const row of statusByMonth) {
        const monthIndex = months.indexOf(row.month);
        if (monthIndex >= 0 && result[monthIndex]) {
          result[monthIndex][row.status] = row.count;
        }
      }

      return result;
    }),

  // ──── 16) Available months ────
  getAvailableMonths: optionalAuthProcedure
    .handler(async ({ context }) => {
      // Use eip_snapshots updated_at for speed instead of scanning eip_status_events
      const results = await prisma.$queryRawUnsafe<Array<{ month: string }>>(
        `SELECT DISTINCT TO_CHAR(date_trunc('month', s.updated_at), 'YYYY-MM') AS month
         FROM eip_snapshots s
         UNION
         SELECT DISTINCT TO_CHAR(date_trunc('month', e.changed_at), 'YYYY-MM') AS month
         FROM eip_status_events e
         WHERE e.changed_at >= (NOW() - INTERVAL '36 months')
         ORDER BY month DESC
         LIMIT 60`
      );

      return results.map((r) => r.month);
    }),
};
