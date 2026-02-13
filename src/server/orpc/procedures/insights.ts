import { os, checkAPIToken, type Ctx } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

const repoFilterSchema = z.object({
  repo: z.enum(['eips', 'ercs', 'rips']).optional(),
})

// Helper: resolve repo filter to repository IDs (avoids SPLIT_PART in every query)
async function getRepoIds(repo?: string): Promise<number[] | null> {
  if (!repo) return null;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    `SELECT id FROM repositories WHERE LOWER(type) = LOWER($1)`,
    repo === 'eips' ? 'EIPS' : repo === 'ercs' ? 'ERCS' : 'RIPS'
  );
  return rows.map((r) => r.id);
}

export const insightsProcedures = {
  // ──── 1) Monthly Status Snapshot ────
  // Uses eip_snapshots (current state — fast) + monthly transition counts for delta
  getMonthlyStatusSnapshot: os
    .$context<Ctx>()
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

      // Current counts from eip_snapshots (small table, very fast)
      const currentCounts = await prisma.$queryRawUnsafe<Array<{
        status: string;
        repo_type: string;
        count: bigint;
      }>>(
        `SELECT
          s.status,
          COALESCE(LOWER(r.type), 'unknown') AS repo_type,
          COUNT(*)::bigint AS count
        FROM eip_snapshots s
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ($1::int[] IS NULL OR s.repository_id = ANY($1))
        GROUP BY s.status, COALESCE(LOWER(r.type), 'unknown')
        ORDER BY s.status`,
        repoIds
      );

      // Transition counts for the selected month (arrivals into each status)
      const monthStart = `${input.month}-01`;
      const [y, m] = input.month.split('-').map(Number);
      const nextDate = new Date(y, m, 1);
      const monthEnd = nextDate.toISOString().split('T')[0];

      const deltas = await prisma.$queryRawUnsafe<Array<{
        to_status: string;
        repo_type: string;
        arrivals: bigint;
      }>>(
        `SELECT
          e.to_status,
          COALESCE(LOWER(r.type), 'unknown') AS repo_type,
          COUNT(*)::bigint AS arrivals
        FROM eip_status_events e
        LEFT JOIN repositories r ON e.repository_id = r.id
        WHERE e.changed_at >= $1::date AND e.changed_at < $2::date
          AND ($3::int[] IS NULL OR e.repository_id = ANY($3))
        GROUP BY e.to_status, COALESCE(LOWER(r.type), 'unknown')`,
        monthStart,
        monthEnd,
        repoIds
      );

      const deltaLookup: Record<string, Record<string, number>> = {};
      for (const d of deltas) {
        const repo = d.repo_type || 'unknown';
        if (!deltaLookup[d.to_status]) deltaLookup[d.to_status] = {};
        deltaLookup[d.to_status][repo] = Number(d.arrivals);
      }

      return currentCounts.map((r) => {
        const repo = r.repo_type || 'unknown';
        const delta = deltaLookup[r.status]?.[repo] ?? 0;
        return {
          status: r.status,
          repo,
          count: Number(r.count),
          prevCount: Number(r.count) - delta,
          delta,
        };
      });
    }),

  // ──── 2) Status Flow Over Time (stacked area) ────
  // Counts transition events per month (last 24 months for speed)
  getStatusFlowOverTime: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

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
  getDeadlineVolatility: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

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
  getEditorsLeaderboard: os
    .$context<Ctx>()
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

      const monthStart = input.month ? `${input.month}-01` : null;
      const monthEnd = input.month ? (() => {
        const [y, m] = input.month!.split('-').map(Number);
        return new Date(y, m, 1).toISOString().split('T')[0];
      })() : null;

      const results = await prisma.$queryRawUnsafe<Array<{
        editor: string;
        reviews: bigint;
        prs_touched: bigint;
        comments: bigint;
      }>>(
        `SELECT
          pe.actor AS editor,
          COUNT(*) FILTER (WHERE pe.event_type = 'reviewed')::bigint AS reviews,
          COUNT(DISTINCT pe.pr_number)::bigint AS prs_touched,
          COUNT(*) FILTER (WHERE pe.event_type IN ('commented', 'issue_comment'))::bigint AS comments
        FROM pr_events pe
        WHERE pe.actor_role = 'EDITOR'
          AND ($1::date IS NULL OR pe.created_at >= $1::date)
          AND ($2::date IS NULL OR pe.created_at < $2::date)
          AND ($3::int[] IS NULL OR pe.repository_id = ANY($3))
        GROUP BY pe.actor
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

  // ──── 5) Open PRs ────
  getOpenPRs: os
    .$context<Ctx>()
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

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
  getPRLifecycleFunnel: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

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
        WHERE ($1::int[] IS NULL OR p.repository_id = ANY($1))`,
        repoIds
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
  getGovernanceStatesOverTime: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

      const results = await prisma.$queryRawUnsafe<Array<{
        current_state: string;
        count: bigint;
      }>>(
        `SELECT
          g.current_state,
          COUNT(*)::bigint AS count
        FROM pr_governance_state g
        WHERE ($1::int[] IS NULL OR g.repository_id = ANY($1))
        GROUP BY g.current_state
        ORDER BY count DESC`,
        repoIds
      );

      return results.map((r) => ({
        state: r.current_state,
        count: Number(r.count),
      }));
    }),

  // ──── 8) Time-to-Decision ────
  getTimeToDecision: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

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
        GROUP BY 1, 2
        ORDER BY 1, 2`,
        repoIds
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
  getBottleneckHeatmap: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

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
        GROUP BY 1, 2
        ORDER BY 1 DESC, 3 DESC
        LIMIT 200`,
        repoIds
      );

      return results.map((r) => ({
        month: r.month,
        state: r.state,
        count: Number(r.count),
      }));
    }),

  // ──── 10) Upgrade Timeline ────
  getUpgradeTimeline: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
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
  getUpgradeCompositionChanges: os
    .$context<Ctx>()
    .input(z.object({
      upgradeId: z.number().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
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
  getEIPTimeline: os
    .$context<Ctx>()
    .input(z.object({
      eipNumber: z.number(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      // Sequential queries to avoid connection pool pressure
      const snapshot = await prisma.$queryRawUnsafe<Array<{
        status: string;
        type: string | null;
        category: string | null;
        deadline: string | null;
        updated_at: string;
        title: string | null;
        author: string | null;
        created_at: string | null;
      }>>(
        `SELECT s.status, s.type, s.category,
                TO_CHAR(s.deadline, 'YYYY-MM-DD') AS deadline,
                TO_CHAR(s.updated_at, 'YYYY-MM-DD') AS updated_at,
                ei.title, ei.author, TO_CHAR(ei.created_at, 'YYYY-MM-DD') AS created_at
         FROM eip_snapshots s
         JOIN eips ei ON s.eip_id = ei.id
         WHERE ei.eip_number = $1`,
        input.eipNumber
      );

      const statusEvents = await prisma.$queryRawUnsafe<Array<{
        from_status: string | null;
        to_status: string;
        changed_at: string;
        pr_number: number | null;
      }>>(
        `SELECT e.from_status, e.to_status, TO_CHAR(e.changed_at, 'YYYY-MM-DD HH24:MI') AS changed_at, e.pr_number
         FROM eip_status_events e
         JOIN eips ei ON e.eip_id = ei.id
         WHERE ei.eip_number = $1
         ORDER BY e.changed_at ASC`,
        input.eipNumber
      );

      const categoryEvents = await prisma.$queryRawUnsafe<Array<{
        from_category: string | null;
        to_category: string;
        changed_at: string;
      }>>(
        `SELECT e.from_category, e.to_category, TO_CHAR(e.changed_at, 'YYYY-MM-DD HH24:MI') AS changed_at
         FROM eip_category_events e
         JOIN eips ei ON e.eip_id = ei.id
         WHERE ei.eip_number = $1
         ORDER BY e.changed_at ASC`,
        input.eipNumber
      );

      const deadlineEvents = await prisma.$queryRawUnsafe<Array<{
        previous_deadline: string | null;
        new_deadline: string | null;
        changed_at: string;
      }>>(
        `SELECT TO_CHAR(d.previous_deadline, 'YYYY-MM-DD') AS previous_deadline,
                TO_CHAR(d.new_deadline, 'YYYY-MM-DD') AS new_deadline,
                TO_CHAR(d.changed_at, 'YYYY-MM-DD HH24:MI') AS changed_at
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
        merged_at: string | null;
        num_comments: number | null;
        num_reviews: number | null;
        num_commits: number | null;
        num_files: number | null;
        created_at: string | null;
      }>>(
        `SELECT p.pr_number, p.title, p.author, p.state,
                TO_CHAR(p.merged_at, 'YYYY-MM-DD') AS merged_at,
                p.num_comments, p.num_reviews, p.num_commits, p.num_files,
                TO_CHAR(p.created_at, 'YYYY-MM-DD') AS created_at
         FROM pull_requests p
         JOIN pull_request_eips pre ON pre.pr_number = p.pr_number AND pre.repository_id = p.repository_id
         WHERE pre.eip_number = $1
         ORDER BY p.created_at ASC`,
        input.eipNumber
      );

      const snap = snapshot[0] ?? null;

      return {
        eipNumber: input.eipNumber,
        title: snap?.title ?? null,
        author: snap?.author ?? null,
        createdAt: snap?.created_at ?? null,
        currentStatus: snap?.status ?? null,
        currentType: snap?.type ?? null,
        currentCategory: snap?.category ?? null,
        deadline: snap?.deadline ?? null,
        lastUpdated: snap?.updated_at ?? null,
        statusEvents: statusEvents.map((e) => ({
          from: e.from_status,
          to: e.to_status,
          date: e.changed_at,
          prNumber: e.pr_number,
        })),
        categoryEvents: categoryEvents.map((e) => ({
          from: e.from_category,
          to: e.to_category,
          date: e.changed_at,
        })),
        deadlineEvents: deadlineEvents.map((e) => ({
          previous: e.previous_deadline,
          newDeadline: e.new_deadline,
          date: e.changed_at,
        })),
        linkedPRs: linkedPRs.map((p) => ({
          prNumber: p.pr_number,
          title: p.title,
          author: p.author,
          state: p.state,
          mergedAt: p.merged_at,
          comments: p.num_comments ?? 0,
          reviews: p.num_reviews ?? 0,
          commits: p.num_commits ?? 0,
          files: p.num_files ?? 0,
          createdAt: p.created_at,
        })),
      };
    }),

  // ──── 13) Available months ────
  getAvailableMonths: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

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
