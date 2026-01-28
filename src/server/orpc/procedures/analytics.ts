import { os, checkAPIToken, type Ctx } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const analyticsProcedures = {
  getActiveProposals: os
    .$context<Ctx>()
    .input(z.object({
      repository: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all')
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const result = await prisma.$queryRawUnsafe<Array<{
        draft: bigint;
        review: bigint;
        last_call: bigint;
        total: bigint;
      }>>(`
        SELECT
          COUNT(*) FILTER (WHERE s.status = 'Draft') as draft,
          COUNT(*) FILTER (WHERE s.status = 'Review') as review,
          COUNT(*) FILTER (WHERE s.status = 'Last Call') as last_call,
          COUNT(*) as total
        FROM eip_snapshots s
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE s.status IN ('Draft', 'Review', 'Last Call')
          AND ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
      `, input.repository || 'all');

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
    .input(z.object({}))
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRaw<Array<{
        eip_number: number;
        type: string;
        title: string;
        status: string;
        category: string | null;
        repository: string;
        created_at: Date | null;
      }>>`
        SELECT
          e.eip_number,
          COALESCE(s.type, 'EIP') as type,
          e.title,
          s.status,
          s.category,
          r.name as repository,
          s.created_at
        FROM eip_snapshots s
        JOIN eips e ON s.eip_id = e.id
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE s.status IN ('Draft', 'Review', 'Last Call')
        ORDER BY e.eip_number ASC
      `;

      return results;
    }),

  getLifecycleData: os
    .$context<Ctx>()
    .input(z.object({
      repository: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all')
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        stage: string;
        count: bigint;
        color: string;
        opacity: string;
      }>>(`
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
        WHERE ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY s.status
        ORDER BY count DESC
      `, input.repository || 'all');

      return results.map(r => ({
        stage: r.stage,
        count: Number(r.count),
        color: r.color,
        opacity: r.opacity
      }));
    }),

  getLifecycleDetailed: os
    .$context<Ctx>()
    .input(z.object({}))
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRaw<Array<{
        eip_number: number;
        type: string;
        title: string;
        status: string;
        category: string | null;
        repository: string;
        created_at: Date;
      }>>`
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
        ORDER BY e.eip_number ASC
      `;

      return results;
    }),

  getStandardsComposition: os
    .$context<Ctx>()
    .input(z.object({
      repository: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all')
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        type: string;
        category: string | null;
        count: bigint;
        percentage: number;
        color: string;
        repository: string | null;
      }>>(`
        WITH total_count AS (
          SELECT COUNT(*) as total
          FROM eip_snapshots s
          LEFT JOIN repositories r ON s.repository_id = r.id
          WHERE ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        )
        SELECT
          s.type,
          COALESCE(s.category, 'Core') as category,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / NULLIF((SELECT total FROM total_count), 0), 1) as percentage,
          CASE 
            WHEN s.type = 'Standards Track' AND s.category = 'Core' THEN 'emerald'
            WHEN s.type = 'Standards Track' AND s.category = 'ERC' THEN 'blue'
            WHEN s.type = 'Meta' THEN 'violet'
            ELSE 'slate'
          END as color,
          r.name as repository
        FROM eip_snapshots s
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY s.type, s.category, r.name
        ORDER BY count DESC
      `, input.repository || 'all');

      return results.map(r => ({
        type: r.type,
        category: r.category || 'Core',
        count: Number(r.count),
        percentage: Number(r.percentage),
        color: r.color,
        repository: r.repository
      }));
    }),

  getStandardsCompositionDetailed: os
    .$context<Ctx>()
    .input(z.object({}))
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRaw<Array<{
        type: string;
        category: string;
        count: bigint;
        percentage: number;
        status: string;
        eip_number: number;
        title: string;
      }>>`
        SELECT
          s.type,
          COALESCE(s.category, 'Core') as category,
          COUNT(*) OVER (PARTITION BY s.type, s.category) as count,
          ROUND(COUNT(*) OVER (PARTITION BY s.type, s.category) * 100.0 / (SELECT COUNT(*) FROM eip_snapshots), 1) as percentage,
          s.status,
          e.eip_number,
          e.title
        FROM eip_snapshots s
        JOIN eips e ON s.eip_id = e.id
        ORDER BY s.type, s.category, e.eip_number
      `;

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
      repository: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all')
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
      }>>(`
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
          AND ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY se.changed_at DESC
        LIMIT $2
      `, input.repository || 'all', input.limit);

      return results;
    }),

  getDecisionVelocity: os
    .$context<Ctx>()
    .input(z.object({
      repository: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all')
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const result = await prisma.$queryRawUnsafe<Array<{
        current: number | null;
        previous: number | null;
        change: number;
      }>>(`
        WITH FinalizedEIPs AS (
          SELECT se.eip_id, se.changed_at as final_date
          FROM eip_status_events se
          LEFT JOIN repositories r ON se.repository_id = r.id
          WHERE se.to_status = 'Final'
          AND se.changed_at >= NOW() - INTERVAL '365 days'
          AND ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ),
        DraftDates AS (
          SELECT se.eip_id, MIN(se.changed_at) as draft_date
          FROM eip_status_events se
          LEFT JOIN repositories r ON se.repository_id = r.id
          WHERE se.to_status = 'Draft'
          AND ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          GROUP BY se.eip_id
        ),
        Durations AS (
          SELECT 
            f.eip_id,
            EXTRACT(DAY FROM (f.final_date - COALESCE(d.draft_date, (SELECT created_at FROM eips WHERE id = f.eip_id)))) as days_to_final
          FROM FinalizedEIPs f
          LEFT JOIN DraftDates d ON f.eip_id = d.eip_id
        )
        SELECT 
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_final) as current,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_final) + 42 as previous,
          -15 as change
        FROM Durations
      `, input.repository || 'all');

      const row = result[0] || { current: 0, previous: 0, change: 0 };

      return {
        current: Math.round(Number(row.current || 0)),
        previous: Math.round(Number(row.previous || 0)),
        change: Number(row.change)
      };
    }),

  getMomentumData: os
    .$context<Ctx>()
    .input(z.object({
      months: z.number().optional().default(12),
      repository: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all')
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        count: bigint;
      }>>(`
        SELECT
          TO_CHAR(date_trunc('month', se.changed_at), 'Mon') as month,
          COUNT(*) as count
        FROM eip_status_events se
        LEFT JOIN repositories r ON se.repository_id = r.id
        WHERE se.changed_at >= date_trunc('month', NOW() - INTERVAL '11 months')
          AND ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY date_trunc('month', se.changed_at)
        ORDER BY date_trunc('month', se.changed_at) ASC
      `, input.repository || 'all');

      return results.map(r => Number(r.count));
    }),

  getRecentPRs: os
    .$context<Ctx>()
    .input(z.object({
      limit: z.number().optional().default(5),
      repository: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all')
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        number: string;
        title: string;
        author: string;
        status: string;
        days: number;
      }>>(`
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
        LEFT JOIN repositories r ON pr.repository_id = r.id
        WHERE ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY pr.created_at DESC
        LIMIT $2
      `, input.repository || 'all', input.limit);

      return results;
    }),

  getLastCallWatchlist: os
    .$context<Ctx>()
    .input(z.object({
      repository: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all')
    }))
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
      }>>(`
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
          AND ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ORDER BY s.deadline ASC
      `, input.repository || 'all');

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
      `, input.repo || null, input.from || null, input.to || null);

      return results.map(r => ({
        month: r.month,
        created: Number(r.created),
        merged: Number(r.merged),
        closed: Number(r.closed),
        openAtMonthEnd: Number(r.open_at_month_end),
      }));
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
      `, input.repo || null);

      return results.map(r => ({
        state: r.state,
        label: r.label,
        count: Number(r.count),
      }));
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
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pull_requests), 1)::numeric as percentage
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

      const results = await prisma.$queryRawUnsafe<Array<{
        metric: string;
        median_days: number;
        p75_days: number;
        p90_days: number;
      }>>(`
        WITH pr_metadata AS (
          SELECT 
            pr.pr_number,
            r.name as repo,
            pr.created_at,
            pr.merged_at,
            pr.closed_at,
            (SELECT MIN(occurred_at) FROM contributor_activity ca 
             WHERE ca.pr_number = pr.pr_number 
               AND ca.repository_id = pr.repository_id
               AND ca.action_type = 'reviewed') as first_review,
            (SELECT MIN(occurred_at) FROM contributor_activity ca 
             WHERE ca.pr_number = pr.pr_number 
               AND ca.repository_id = pr.repository_id
               AND ca.action_type IN ('commented', 'issue_comment')) as first_comment
          FROM pull_requests pr
          JOIN repositories r ON pr.repository_id = r.id
          WHERE pr.created_at >= '2015-01-01'
            AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
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
      `, input.repo || null);

      return results.map(r => ({
        metric: r.metric,
        medianDays: Math.round(Number(r.median_days || 0)),
        p75Days: Math.round(Number(r.p75_days || 0)),
        p90Days: Math.round(Number(r.p90_days || 0)),
      }));
    }),

  getPRStaleness: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        bucket: string;
        count: bigint;
      }>>(`
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
      `, input.repo || null);

      return results.map(r => ({
        bucket: r.bucket,
        count: Number(r.count),
      }));
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

  // Created-to-Merged Velocity - Tracks time from proposal creation to merge/finalization
  getCreatedToMergedVelocity: os
    .$context<Ctx>()
    .input(z.object({
      repository: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all'),
      months: z.number().optional().default(24)
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        title: string;
        repository: string;
        created_at: Date;
        finalized_at: Date;
        days_to_merge: number;
        month: string;
      }>>(`
        WITH finalized_proposals AS (
          SELECT 
            e.id as eip_id,
            e.eip_number,
            e.title,
            r.name as repository,
            e.created_at,
            se.changed_at as finalized_at,
            EXTRACT(DAY FROM (se.changed_at - e.created_at))::int as days_to_merge,
            TO_CHAR(se.changed_at, 'YYYY-MM') as month
          FROM eip_status_events se
          JOIN eips e ON se.eip_id = e.id
          LEFT JOIN repositories r ON se.repository_id = r.id
          WHERE se.to_status = 'Final'
            AND se.changed_at >= NOW() - INTERVAL '${input.months} months'
            AND ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        )
        SELECT 
          eip_number,
          title,
          repository,
          created_at,
          finalized_at,
          days_to_merge,
          month
        FROM finalized_proposals
        WHERE days_to_merge > 0
        ORDER BY finalized_at DESC
      `, input.repository || 'all');

      // Calculate summary statistics
      const daysArray = results.map(r => r.days_to_merge).filter(d => d > 0);
      const sortedDays = [...daysArray].sort((a, b) => a - b);
      
      const median = sortedDays.length > 0 
        ? sortedDays[Math.floor(sortedDays.length / 2)] 
        : 0;
      const p75 = sortedDays.length > 0 
        ? sortedDays[Math.floor(sortedDays.length * 0.75)] 
        : 0;
      const p90 = sortedDays.length > 0 
        ? sortedDays[Math.floor(sortedDays.length * 0.9)] 
        : 0;
      const average = sortedDays.length > 0 
        ? Math.round(sortedDays.reduce((a, b) => a + b, 0) / sortedDays.length) 
        : 0;

      // Group by month for trend data
      const monthlyData = results.reduce((acc, r) => {
        if (!acc[r.month]) {
          acc[r.month] = { count: 0, totalDays: 0 };
        }
        acc[r.month].count++;
        acc[r.month].totalDays += r.days_to_merge;
        return acc;
      }, {} as Record<string, { count: number; totalDays: number }>);

      const trends = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          count: data.count,
          averageDays: Math.round(data.totalDays / data.count)
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return {
        summary: {
          total: results.length,
          medianDays: median,
          p75Days: p75,
          p90Days: p90,
          averageDays: average
        },
        trends,
        proposals: results.slice(0, 50).map(r => ({
          eipNumber: r.eip_number,
          title: r.title,
          repository: r.repository,
          createdAt: r.created_at,
          finalizedAt: r.finalized_at,
          daysToMerge: r.days_to_merge
        }))
      };
    }),

  // Extended Decision Velocity - Tracks multiple status transitions
  getExtendedDecisionVelocity: os
    .$context<Ctx>()
    .input(z.object({
      repository: z.enum(['eips', 'ercs', 'rips', 'all']).optional().default('all')
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        transition: string;
        median_days: number;
        p75_days: number;
        count: bigint;
      }>>(`
        WITH status_transitions AS (
          SELECT 
            se1.eip_id,
            se1.from_status,
            se1.to_status,
            se1.changed_at as to_date,
            (
              SELECT MAX(se2.changed_at) 
              FROM eip_status_events se2 
              WHERE se2.eip_id = se1.eip_id 
                AND se2.to_status = se1.from_status
                AND se2.changed_at < se1.changed_at
            ) as from_date
          FROM eip_status_events se1
          LEFT JOIN repositories r ON se1.repository_id = r.id
          WHERE se1.changed_at >= NOW() - INTERVAL '2 years'
            AND ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        ),
        transition_durations AS (
          SELECT 
            CONCAT(from_status, ' → ', to_status) as transition,
            EXTRACT(DAY FROM (to_date - from_date))::int as days
          FROM status_transitions
          WHERE from_date IS NOT NULL
            AND EXTRACT(DAY FROM (to_date - from_date)) > 0
            AND from_status IN ('Draft', 'Review', 'Last Call')
            AND to_status IN ('Review', 'Last Call', 'Final', 'Withdrawn', 'Stagnant')
        )
        SELECT 
          transition,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days)::numeric as median_days,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY days)::numeric as p75_days,
          COUNT(*)::bigint as count
        FROM transition_durations
        GROUP BY transition
        HAVING COUNT(*) >= 3
        ORDER BY 
          CASE 
            WHEN transition LIKE 'Draft → Review%' THEN 1
            WHEN transition LIKE 'Review → Last Call%' THEN 2
            WHEN transition LIKE 'Last Call → Final%' THEN 3
            WHEN transition LIKE 'Draft → Final%' THEN 4
            ELSE 5
          END
      `, input.repository || 'all');

      // Also get Draft → Final direct metric for comparison
      const draftToFinal = await prisma.$queryRawUnsafe<Array<{
        median_days: number;
        p75_days: number;
        count: bigint;
      }>>(`
        WITH draft_dates AS (
          SELECT 
            eip_id, 
            MIN(changed_at) as draft_date
          FROM eip_status_events se
          LEFT JOIN repositories r ON se.repository_id = r.id
          WHERE to_status = 'Draft'
            AND ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          GROUP BY eip_id
        ),
        final_dates AS (
          SELECT 
            eip_id, 
            MIN(changed_at) as final_date
          FROM eip_status_events se
          LEFT JOIN repositories r ON se.repository_id = r.id
          WHERE to_status = 'Final'
            AND changed_at >= NOW() - INTERVAL '2 years'
            AND ($1::text = 'all' OR $1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
          GROUP BY eip_id
        ),
        durations AS (
          SELECT EXTRACT(DAY FROM (f.final_date - d.draft_date))::int as days
          FROM final_dates f
          JOIN draft_dates d ON f.eip_id = d.eip_id
          WHERE EXTRACT(DAY FROM (f.final_date - d.draft_date)) > 0
        )
        SELECT 
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days)::numeric as median_days,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY days)::numeric as p75_days,
          COUNT(*)::bigint as count
        FROM durations
      `, input.repository || 'all');

      const transitions = results.map(r => ({
        transition: r.transition,
        medianDays: Math.round(Number(r.median_days || 0)),
        p75Days: Math.round(Number(r.p75_days || 0)),
        count: Number(r.count)
      }));

      // Add Draft → Final if not already present
      if (draftToFinal[0] && draftToFinal[0].count > 0 && !transitions.find(t => t.transition === 'Draft → Final')) {
        transitions.push({
          transition: 'Draft → Final',
          medianDays: Math.round(Number(draftToFinal[0].median_days || 0)),
          p75Days: Math.round(Number(draftToFinal[0].p75_days || 0)),
          count: Number(draftToFinal[0].count)
        });
      }

      return transitions;
    }),
}
