import { optionalAuthProcedure, publicProcedure, checkAPIToken } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'
import { unstable_cache } from 'next/cache'

// ── Cached helpers ──

const getYearsOverviewCached = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<Array<{
      year: number;
      new_eips: bigint;
      status_changes: bigint;
      active_prs: bigint;
    }>>`
      SELECT
        years.y AS year,
        COALESCE(e.cnt, 0) AS new_eips,
        COALESCE(s.cnt, 0) AS status_changes,
        COALESCE(p.cnt, 0) AS active_prs
      FROM (
        SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int AS y FROM eips WHERE created_at IS NOT NULL
        UNION
        SELECT DISTINCT EXTRACT(YEAR FROM changed_at)::int FROM eip_status_events
        UNION
        SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int FROM pull_requests WHERE created_at IS NOT NULL
      ) years
      LEFT JOIN (SELECT EXTRACT(YEAR FROM created_at)::int AS y, COUNT(*) AS cnt FROM eips WHERE created_at IS NOT NULL GROUP BY 1) e ON e.y = years.y
      LEFT JOIN (SELECT EXTRACT(YEAR FROM changed_at)::int AS y, COUNT(*) AS cnt FROM eip_status_events GROUP BY 1) s ON s.y = years.y
      LEFT JOIN (SELECT EXTRACT(YEAR FROM created_at)::int AS y, COUNT(*) AS cnt FROM pull_requests WHERE created_at IS NOT NULL GROUP BY 1) p ON p.y = years.y
      ORDER BY years.y DESC
    `;
    return rows.map(r => ({
      year: r.year,
      newEIPs: Number(r.new_eips),
      statusChanges: Number(r.status_changes),
      activePRs: Number(r.active_prs),
    }));
  },
  ['explore-yearsOverview'],
  { revalidate: 600 }
);

const getYearStatsCached = unstable_cache(
  async (year: number) => {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);
    const rows = await prisma.$queryRaw<Array<{
      total_new_eips: bigint;
      most_common_status: string | null;
      most_active_category: string | null;
      total_prs: bigint;
    }>>`
      SELECT
        (SELECT COUNT(*) FROM eips WHERE created_at >= ${startDate} AND created_at <= ${endDate}) AS total_new_eips,
        (SELECT status FROM eip_snapshots GROUP BY status ORDER BY COUNT(*) DESC LIMIT 1) AS most_common_status,
        (SELECT category FROM eip_snapshots WHERE category IS NOT NULL GROUP BY category ORDER BY COUNT(*) DESC LIMIT 1) AS most_active_category,
        (SELECT COUNT(*) FROM pull_requests WHERE created_at >= ${startDate} AND created_at <= ${endDate}) AS total_prs
    `;
    const r = rows[0];
    return {
      totalNewEIPs: Number(r?.total_new_eips ?? 0),
      mostCommonStatus: r?.most_common_status ?? null,
      mostActiveCategory: r?.most_active_category ?? null,
      totalPRs: Number(r?.total_prs ?? 0),
    };
  },
  ['explore-yearStats'],
  { revalidate: 600 }
);

const getYearActivityChartCached = unstable_cache(
  async (year: number) => {
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);
    const rows = await prisma.$queryRaw<Array<{
      month: number;
      eips_touched: bigint;
      new_eips: bigint;
      status_changes: bigint;
    }>>`
      WITH months AS (SELECT generate_series(1, 12) AS m)
      SELECT
        months.m AS month,
        COALESCE(et.cnt, 0) AS eips_touched,
        COALESCE(ne.cnt, 0) AS new_eips,
        COALESCE(sc.cnt, 0) AS status_changes
      FROM months
      LEFT JOIN (
        SELECT EXTRACT(MONTH FROM changed_at)::int AS m, COUNT(DISTINCT eip_id) AS cnt
        FROM eip_status_events WHERE changed_at >= ${startDate} AND changed_at <= ${endDate}
        GROUP BY 1
      ) et ON et.m = months.m
      LEFT JOIN (
        SELECT EXTRACT(MONTH FROM created_at)::int AS m, COUNT(*) AS cnt
        FROM eips WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY 1
      ) ne ON ne.m = months.m
      LEFT JOIN (
        SELECT EXTRACT(MONTH FROM changed_at)::int AS m, COUNT(*) AS cnt
        FROM eip_status_events WHERE changed_at >= ${startDate} AND changed_at <= ${endDate}
        GROUP BY 1
      ) sc ON sc.m = months.m
      ORDER BY months.m
    `;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return rows.map(r => ({
      month: monthNames[r.month - 1],
      eipsTouched: Number(r.eips_touched),
      newEIPs: Number(r.new_eips),
      statusChanges: Number(r.status_changes),
    }));
  },
  ['explore-yearActivityChart'],
  { revalidate: 600 }
);

/** Detailed per-EIP activity for CSV export. Not cached to avoid large payloads. */
async function getYearActivityChartDetail(year: number) {
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const [eipsTouchedRows, newEIPsRows, statusChangesRows] = await Promise.all([
    prisma.$queryRaw<Array<{
      month: number;
      eip_number: number;
      title: string | null;
      author: string | null;
      status: string | null;
      category: string | null;
      type: string | null;
      status_changes_count: bigint;
    }>>`
      SELECT
        EXTRACT(MONTH FROM ese.changed_at)::int AS month,
        e.eip_number,
        e.title,
        e.author,
        s.status,
        s.category,
        s.type,
        COUNT(*)::bigint AS status_changes_count
      FROM eip_status_events ese
      JOIN eips e ON e.id = ese.eip_id
      LEFT JOIN eip_snapshots s ON s.eip_id = e.id
      WHERE ese.changed_at >= ${startDate} AND ese.changed_at <= ${endDate}
      GROUP BY EXTRACT(MONTH FROM ese.changed_at), e.eip_number, e.title, e.author, s.status, s.category, s.type
      ORDER BY month, e.eip_number
    `,
    prisma.$queryRaw<Array<{
      month: number;
      eip_number: number;
      title: string | null;
      author: string | null;
      status: string | null;
      category: string | null;
      type: string | null;
      created_at: Date | null;
    }>>`
      SELECT
        EXTRACT(MONTH FROM e.created_at)::int AS month,
        e.eip_number,
        e.title,
        e.author,
        s.status,
        s.category,
        s.type,
        e.created_at
      FROM eips e
      LEFT JOIN eip_snapshots s ON s.eip_id = e.id
      WHERE e.created_at >= ${startDate} AND e.created_at <= ${endDate}
      ORDER BY month, e.eip_number
    `,
    prisma.$queryRaw<Array<{
      month: number;
      eip_number: number;
      title: string | null;
      author: string | null;
      status: string | null;
      category: string | null;
      type: string | null;
      from_status: string | null;
      to_status: string;
      changed_at: Date;
    }>>`
      SELECT
        EXTRACT(MONTH FROM ese.changed_at)::int AS month,
        e.eip_number,
        e.title,
        e.author,
        s.status,
        s.category,
        s.type,
        ese.from_status,
        ese.to_status,
        ese.changed_at
      FROM eip_status_events ese
      JOIN eips e ON e.id = ese.eip_id
      LEFT JOIN eip_snapshots s ON s.eip_id = e.id
      WHERE ese.changed_at >= ${startDate} AND ese.changed_at <= ${endDate}
      ORDER BY month, ese.changed_at, e.eip_number
    `,
  ]);

  return {
    eipsTouched: eipsTouchedRows.map(r => ({
      month: monthNames[r.month - 1],
      monthNum: r.month,
      eipNumber: r.eip_number,
      title: r.title ?? '',
      author: r.author ?? '',
      status: r.status ?? '',
      category: r.category ?? '',
      type: r.type ?? '',
      statusChangesCount: Number(r.status_changes_count),
    })),
    newEIPs: newEIPsRows.map(r => ({
      month: monthNames[r.month - 1],
      monthNum: r.month,
      eipNumber: r.eip_number,
      title: r.title ?? '',
      author: r.author ?? '',
      status: r.status ?? '',
      category: r.category ?? '',
      type: r.type ?? '',
      createdAt: r.created_at?.toISOString().slice(0, 10) ?? '',
    })),
    statusChanges: statusChangesRows.map(r => ({
      month: monthNames[r.month - 1],
      monthNum: r.month,
      eipNumber: r.eip_number,
      title: r.title ?? '',
      author: r.author ?? '',
      status: r.status ?? '',
      category: r.category ?? '',
      type: r.type ?? '',
      fromStatus: r.from_status ?? '',
      toStatus: r.to_status,
      changedAt: r.changed_at.toISOString(),
    })),
  };
}

const getStatusCountsCached = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<Array<{
      status: string;
      count: bigint;
      last_updated: Date;
    }>>`
      SELECT status, COUNT(*) AS count, MAX(updated_at) AS last_updated
      FROM eip_snapshots
      GROUP BY status
    `;
    return rows.map(r => ({
      status: r.status,
      count: Number(r.count),
      lastUpdated: r.last_updated?.toISOString() ?? null,
    }));
  },
  ['explore-statusCounts'],
  { revalidate: 300 }
);

const getCategoryCountsCached = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<Array<{
      category: string;
      count: bigint;
    }>>`
      SELECT category, COUNT(*) AS count
      FROM eip_snapshots
      WHERE category IS NOT NULL
      GROUP BY category
    `;
    return rows.map(r => ({ category: r.category, count: Number(r.count) }));
  },
  ['explore-categoryCounts'],
  { revalidate: 300 }
);

const getRoleCountsCached = unstable_cache(
  async () => {
    const rows = await prisma.$queryRaw<Array<{
      role: string;
      unique_actors: bigint;
      total_actions: bigint;
    }>>`
      SELECT role, COUNT(DISTINCT actor) AS unique_actors, COUNT(*) AS total_actions
      FROM contributor_activity
      WHERE role IS NOT NULL
      GROUP BY role
    `;
    return rows.map(r => ({
      role: r.role,
      uniqueActors: Number(r.unique_actors),
      totalActions: Number(r.total_actions),
    }));
  },
  ['explore-roleCounts'],
  { revalidate: 600 }
);

export const exploreProcedures = {
  // ============================================
  // YEAR-BASED QUERIES
  // ============================================

  getYearsOverview: publicProcedure
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);
      return getYearsOverviewCached();
    }),

  // Get monthly activity sparkline for a year
  getYearSparkline: optionalAuthProcedure
    .input(z.object({
      year: z.number().min(2015).max(2030),
    }))
    .handler(async ({ input }) => {

      const startDate = new Date(`${input.year}-01-01`);
      const endDate = new Date(`${input.year}-12-31`);

      const monthlyData = await prisma.$queryRaw<Array<{
        month: number;
        count: bigint;
      }>>`
        SELECT 
          EXTRACT(MONTH FROM changed_at)::int as month,
          COUNT(DISTINCT eip_id) as count
        FROM eip_status_events
        WHERE changed_at >= ${startDate} AND changed_at <= ${endDate}
        GROUP BY EXTRACT(MONTH FROM changed_at)
        ORDER BY month
      `;

      // Fill in missing months with 0
      const result = Array.from({ length: 12 }, (_, i) => {
        const found = monthlyData.find(m => m.month === i + 1);
        return {
          month: i + 1,
          count: found ? Number(found.count) : 0,
        };
      });

      return result;
    }),

  getYearStats: publicProcedure
    .input(z.object({
      year: z.number().min(2015).max(2030),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getYearStatsCached(input.year);
    }),

  // Get EIPs created in a specific year
  getEIPsByYear: optionalAuthProcedure
    .input(z.object({
      year: z.number().min(2015).max(2030),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .handler(async ({ input }) => {const startDate = new Date(`${input.year}-01-01`);
      const endDate = new Date(`${input.year}-12-31`);

      const [items, countResult] = await Promise.all([
        prisma.$queryRaw<Array<{
          id: number; eip_number: number; title: string | null;
          type: string | null; status: string; category: string | null;
          created_at: Date | null; updated_at: Date | null;
        }>>`
          SELECT e.id, e.eip_number, e.title, s.type, COALESCE(s.status, 'Unknown') AS status,
                 s.category, e.created_at, s.updated_at
          FROM eips e
          LEFT JOIN eip_snapshots s ON e.id = s.eip_id
          WHERE e.created_at >= ${startDate} AND e.created_at <= ${endDate}
          ORDER BY e.created_at DESC
          LIMIT ${input.limit} OFFSET ${input.offset}
        `,
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) AS count FROM eips WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        `,
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        items: items.map(eip => ({
          id: eip.id,
          number: eip.eip_number,
          title: eip.title || `EIP-${eip.eip_number}`,
          type: eip.type,
          status: eip.status,
          category: eip.category,
          createdAt: eip.created_at?.toISOString() || null,
          updatedAt: eip.updated_at?.toISOString() || null,
        })),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  getYearActivityChart: publicProcedure
    .input(z.object({
      year: z.number().min(2015).max(2030),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getYearActivityChartCached(input.year);
    }),

  getYearActivityChartDetail: publicProcedure
    .input(z.object({
      year: z.number().min(2015).max(2030),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getYearActivityChartDetail(input.year);
    }),

  // ============================================
  // STATUS-BASED QUERIES
  // ============================================

  getStatusCounts: publicProcedure
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);
      return getStatusCountsCached();
    }),

  getCategoryCounts: publicProcedure
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);
      return getCategoryCountsCached();
    }),

  // Get EIPs by status with filters (supports multi-category and multi-type)
  getEIPsByStatus: optionalAuthProcedure
    .input(z.object({
      status: z.string().optional(),
      categories: z.array(z.string()).optional(),
      types: z.array(z.string()).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .handler(async ({ input }) => {
      const filters: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 0;

      if (input.status) {
        paramIdx++;
        filters.push(`AND s.status = $${paramIdx}`);
        params.push(input.status);
      }
      if (input.categories && input.categories.length > 0) {
        const placeholders = input.categories.map(() => {
          paramIdx++;
          return `$${paramIdx}`;
        }).join(', ');
        filters.push(`AND s.category IN (${placeholders})`);
        params.push(...input.categories);
      }
      if (input.types && input.types.length > 0) {
        const placeholders = input.types.map(() => {
          paramIdx++;
          return `$${paramIdx}`;
        }).join(', ');
        filters.push(`AND s.type IN (${placeholders})`);
        params.push(...input.types);
      }

      const filterClause = filters.length > 0 ? filters.join(' ') : '';
      const limit = input.limit;
      const offset = input.offset;

      const [items, countResult] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{
          eip_id: number; eip_number: number; title: string | null;
          type: string | null; status: string; category: string | null;
          updated_at: Date | null; last_changed_at: Date | null;
        }>>(
          `SELECT s.eip_id, e.eip_number, e.title, s.type, s.status, s.category, s.updated_at,
                  (SELECT MAX(changed_at) FROM eip_status_events ese WHERE ese.eip_id = s.eip_id) AS last_changed_at
           FROM eip_snapshots s
           JOIN eips e ON e.id = s.eip_id
           WHERE 1=1 ${filterClause}
           ORDER BY s.updated_at DESC
           LIMIT ${limit} OFFSET ${offset}`,
          ...params
        ),
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*) AS count FROM eip_snapshots s WHERE 1=1 ${filterClause}`,
          ...params
        ),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        items: items.map(row => {
          const daysInStatus = row.last_changed_at
            ? Math.floor((Date.now() - new Date(row.last_changed_at).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          return {
            id: row.eip_id,
            number: row.eip_number,
            title: row.title || `EIP-${row.eip_number}`,
            type: row.type,
            status: row.status,
            category: row.category,
            updatedAt: row.updated_at?.toISOString() || null,
            daysInStatus,
          };
        }),
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  getStatusFlow: publicProcedure
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);
      const statusOrder = ['Draft', 'Review', 'Last Call', 'Final', 'Living', 'Stagnant', 'Withdrawn'];
      const cached = await getStatusCountsCached();
      const countMap = new Map(cached.map(s => [s.status, s.count]));
      const ordered = statusOrder.map(status => ({ status, count: countMap.get(status) || 0 }));
      const extras = cached
        .filter(s => !statusOrder.includes(s.status))
        .map(s => ({ status: s.status, count: s.count }));
      return [...ordered, ...extras];
    }),

  // ============================================
  // ROLE-BASED QUERIES (Editors, Reviewers, Contributors)
  // ============================================

  // Get role leaderboard
  getRoleLeaderboard: optionalAuthProcedure
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']).optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .handler(async ({ input }) => {
      // Use contributor_activity for role-based stats (has proper role data)
      if (input.role) {
        const roleLeaderboard = await prisma.$queryRaw<Array<{
          actor: string;
          total_actions: bigint;
          last_activity: Date | null;
          distinct_prs: bigint;
        }>>`
          SELECT 
            ca.actor,
            COUNT(*) as total_actions,
            COUNT(DISTINCT ca.pr_number) as distinct_prs,
            MAX(ca.occurred_at) as last_activity
          FROM contributor_activity ca
          WHERE ca.role = ${input.role}
            AND ca.actor NOT LIKE '%[bot]%'
            AND ca.actor NOT LIKE '%-bot'
            AND LOWER(ca.actor) NOT LIKE '%bot'
            AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
          GROUP BY ca.actor
          ORDER BY total_actions DESC
          LIMIT ${input.limit}
        `;

        return roleLeaderboard.map((entry, index) => ({
          rank: index + 1,
          actor: entry.actor,
          totalScore: Number(entry.total_actions),
          prsReviewed: Number(entry.distinct_prs || 0),  // PRs touched
          comments: Number(entry.total_actions || 0),    // Total contributions
          prsCreated: 0,
          prsMerged: 0,
          avgResponseHours: null,
          lastActivity: entry.last_activity?.toISOString() || null,
          role: input.role,
        }));
      }

      // When no role selected, use contributor_activity for all actors
      const leaderboard = await prisma.$queryRaw<Array<{
        actor: string;
        primary_role: string | null;
        total_actions: bigint;
        last_activity: Date | null;
        distinct_prs: bigint;
      }>>`
        SELECT 
          ca.actor,
          (SELECT role FROM contributor_activity ca2 WHERE ca2.actor = ca.actor ORDER BY occurred_at DESC LIMIT 1) as primary_role,
          COUNT(*) as total_actions,
          COUNT(DISTINCT ca.pr_number) as distinct_prs,
          MAX(ca.occurred_at) as last_activity
        FROM contributor_activity ca
        WHERE ca.actor NOT LIKE '%[bot]%'
          AND ca.actor NOT LIKE '%-bot'
          AND LOWER(ca.actor) NOT LIKE '%bot'
          AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
        GROUP BY ca.actor
        ORDER BY total_actions DESC
        LIMIT ${input.limit}
      `;

      return leaderboard.map((entry, index) => ({
        rank: index + 1,
        actor: entry.actor,
        totalScore: Number(entry.total_actions),
        prsReviewed: Number(entry.distinct_prs || 0),  // PRs touched
        comments: Number(entry.total_actions || 0),    // Total contributions
        prsCreated: 0,
        prsMerged: 0,
        avgResponseHours: null,
        lastActivity: entry.last_activity?.toISOString() || null,
        role: entry.primary_role,
      }));
    }),

  // Get top actors by role
  getTopActorsByRole: optionalAuthProcedure
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']),
      limit: z.number().min(1).max(10).default(3),
    }))
    .handler(async ({ input }) => {const topActors = await prisma.$queryRaw<Array<{
        actor: string;
        actions: bigint;
      }>>`
        SELECT 
          actor,
          COUNT(*) as actions
        FROM contributor_activity
        WHERE role = ${input.role}
        GROUP BY actor
        ORDER BY actions DESC
        LIMIT ${input.limit}
      `;

      return topActors.map(a => ({
        actor: a.actor,
        actions: Number(a.actions),
      }));
    }),

  getRoleCounts: publicProcedure
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);
      return getRoleCountsCached();
    }),

  // Get recent activity timeline for a role
  getRoleActivityTimeline: optionalAuthProcedure
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']).optional(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const roleFilter = input.role ? `AND pe.actor_role = '${input.role}'` : '';
      const events = await prisma.$queryRawUnsafe<Array<{
        id: bigint; actor: string; actor_role: string | null;
        event_type: string; pr_number: number; created_at: Date;
        github_id: string | null; repo_name: string | null;
      }>>(`
        SELECT pe.id, pe.actor, pe.actor_role, pe.event_type, pe.pr_number,
               pe.created_at, pe.github_id, r.name AS repo_name
        FROM pr_events pe
        LEFT JOIN repositories r ON r.id = pe.repository_id
        WHERE pe.actor NOT LIKE '%[bot]%'
          AND pe.actor NOT LIKE '%-bot'
          AND pe.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
          ${roleFilter}
        ORDER BY pe.created_at DESC
        LIMIT ${input.limit}
      `);

      return events.map(e => ({
        id: e.id.toString(),
        actor: e.actor,
        role: e.actor_role,
        eventType: e.event_type,
        prNumber: e.pr_number,
        createdAt: e.created_at.toISOString(),
        githubId: e.github_id,
        repoName: e.repo_name || 'ethereum/EIPs',
      }));
    }),

  // Get role activity sparkline (last 6 months)
  getRoleActivitySparkline: optionalAuthProcedure
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']).optional(),
    }))
    .handler(async ({ input }) => {const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyData = input.role
        ? await prisma.$queryRaw<Array<{
            year_month: string;
            count: bigint;
          }>>`
            SELECT 
              TO_CHAR(occurred_at, 'YYYY-MM') as year_month,
              COUNT(*) as count
            FROM contributor_activity
            WHERE occurred_at >= ${sixMonthsAgo} AND role = ${input.role}
            GROUP BY TO_CHAR(occurred_at, 'YYYY-MM')
            ORDER BY year_month
          `
        : await prisma.$queryRaw<Array<{
            year_month: string;
            count: bigint;
          }>>`
            SELECT 
              TO_CHAR(occurred_at, 'YYYY-MM') as year_month,
              COUNT(*) as count
            FROM contributor_activity
            WHERE occurred_at >= ${sixMonthsAgo}
            GROUP BY TO_CHAR(occurred_at, 'YYYY-MM')
            ORDER BY year_month
          `;

      return monthlyData.map(m => ({
        month: m.year_month,
        count: Number(m.count),
      }));
    }),

  // ============================================
  // TRENDING QUERIES
  // ============================================

  // Get trending proposals
  getTrendingProposals: optionalAuthProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
    }))
    .handler(async ({ input }) => {const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Calculate trending score:
      // (# of pr_events in last 7 days * 2) + (# of comments) + (if status changed in last 7 days ? 10 : 0)
      let trendingData = await prisma.$queryRaw<Array<{
        eip_id: number;
        eip_number: number;
        title: string | null;
        status: string;
        pr_events_count: bigint;
        comments_count: bigint;
        had_status_change: boolean;
        last_activity: Date;
      }>>`
        WITH recent_pr_events AS (
          SELECT 
            e.id as eip_id,
            COUNT(*) as pr_events_count
          FROM pull_request_eips pre
          JOIN eips e ON e.eip_number = pre.eip_number
          JOIN pr_events pe ON pre.pr_number = pe.pr_number AND pre.repository_id = pe.repository_id
          WHERE pe.created_at >= ${sevenDaysAgo}
          GROUP BY e.id
        ),
        pr_comments AS (
          SELECT 
            e.id as eip_id,
            SUM(COALESCE(pr.num_comments, 0)) as comments_count
          FROM pull_request_eips pre
          JOIN eips e ON e.eip_number = pre.eip_number
          JOIN pull_requests pr ON pre.pr_number = pr.pr_number AND pre.repository_id = pr.repository_id
          GROUP BY e.id
        ),
        recent_status_changes AS (
          SELECT DISTINCT eip_id
          FROM eip_status_events
          WHERE changed_at >= ${sevenDaysAgo} AND eip_id IS NOT NULL
        )
        SELECT 
          e.id as eip_id,
          e.eip_number,
          e.title,
          COALESCE(es.status, 'Unknown') as status,
          COALESCE(rpe.pr_events_count, 0) as pr_events_count,
          COALESCE(pc.comments_count, 0) as comments_count,
          rsc.eip_id IS NOT NULL as had_status_change,
          COALESCE(es.updated_at, e.created_at) as last_activity
        FROM eips e
        LEFT JOIN eip_snapshots es ON e.id = es.eip_id
        LEFT JOIN recent_pr_events rpe ON e.id = rpe.eip_id
        LEFT JOIN pr_comments pc ON e.id = pc.eip_id
        LEFT JOIN recent_status_changes rsc ON e.id = rsc.eip_id
        WHERE (rpe.pr_events_count > 0 OR pc.comments_count > 0 OR rsc.eip_id IS NOT NULL)
        ORDER BY (
          COALESCE(rpe.pr_events_count, 0) * 2 + 
          COALESCE(pc.comments_count, 0) + 
          CASE WHEN rsc.eip_id IS NOT NULL THEN 10 ELSE 0 END
        ) DESC
        LIMIT ${input.limit}
      `;

      // Fallback: when no 7-day activity, show recently updated EIPs (last 90 days)
      if (trendingData.length === 0) {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        trendingData = await prisma.$queryRaw<Array<{
          eip_id: number;
          eip_number: number;
          title: string | null;
          status: string;
          pr_events_count: bigint;
          comments_count: bigint;
          had_status_change: boolean;
          last_activity: Date;
        }>>`
          SELECT 
            e.id as eip_id,
            e.eip_number,
            e.title,
            COALESCE(es.status, 'Unknown') as status,
            0::bigint as pr_events_count,
            0::bigint as comments_count,
            false as had_status_change,
            COALESCE(es.updated_at, e.created_at) as last_activity
          FROM eips e
          LEFT JOIN eip_snapshots es ON e.id = es.eip_id
          WHERE es.updated_at >= ${ninetyDaysAgo} OR (e.created_at >= ${ninetyDaysAgo})
          ORDER BY COALESCE(es.updated_at, e.created_at) DESC NULLS LAST
          LIMIT ${input.limit}
        `;
      }

      // Final fallback: show most recent EIPs by number if still empty
      if (trendingData.length === 0) {
        trendingData = await prisma.$queryRaw<Array<{
          eip_id: number;
          eip_number: number;
          title: string | null;
          status: string;
          pr_events_count: bigint;
          comments_count: bigint;
          had_status_change: boolean;
          last_activity: Date;
        }>>`
          SELECT 
            e.id as eip_id,
            e.eip_number,
            e.title,
            COALESCE(es.status, 'Unknown') as status,
            0::bigint as pr_events_count,
            0::bigint as comments_count,
            false as had_status_change,
            COALESCE(es.updated_at, e.created_at) as last_activity
          FROM eips e
          LEFT JOIN eip_snapshots es ON e.id = es.eip_id
          ORDER BY e.eip_number DESC
          LIMIT ${input.limit}
        `;
      }

      return trendingData.map(t => {
        const score = Number(t.pr_events_count) * 2 + Number(t.comments_count) + (t.had_status_change ? 10 : 0);
        
        const trendingReason = [];
        if (Number(t.pr_events_count) > 0) {
          trendingReason.push(`${t.pr_events_count} PR events this week`);
        }
        if (t.had_status_change) {
          trendingReason.push('Status changed this week');
        }
        if (Number(t.comments_count) > 0) {
          trendingReason.push(`${t.comments_count} comments`);
        }

        return {
          eipId: t.eip_id,
          number: t.eip_number,
          title: t.title || `EIP-${t.eip_number}`,
          status: t.status,
          score,
          trendingReason: trendingReason.join(', ') || 'Recent activity',
          lastActivity: t.last_activity?.toISOString() || null,
        };
      });
    }),

  // Get trending heatmap data (last 30 days)
  getTrendingHeatmap: optionalAuthProcedure
    .input(z.object({
      topN: z.number().min(5).max(20).default(10),
    }))
    .handler(async ({ input }) => {const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get top N most active EIPs in last 30 days
      const topEIPs = await prisma.$queryRaw<Array<{
        eip_id: number;
        eip_number: number;
        title: string | null;
        total_activity: bigint;
      }>>`
        WITH activity_counts AS (
          SELECT 
            eip_id,
            COUNT(*) as activity
          FROM eip_status_events
          WHERE changed_at >= ${thirtyDaysAgo}
          GROUP BY eip_id
        )
        SELECT 
          e.id as eip_id,
          e.eip_number,
          e.title,
          COALESCE(ac.activity, 0) as total_activity
        FROM eips e
        LEFT JOIN activity_counts ac ON e.id = ac.eip_id
        WHERE ac.activity > 0
        ORDER BY ac.activity DESC
        LIMIT ${input.topN}
      `;

      const eipIds = topEIPs.map(e => e.eip_id);
      if (eipIds.length === 0) return [];

      // Get daily activity for these EIPs
      const dailyActivity = await prisma.$queryRaw<Array<{
        eip_id: number;
        day: Date;
        activity: bigint;
      }>>`
        SELECT 
          eip_id,
          DATE(changed_at) as day,
          COUNT(*) as activity
        FROM eip_status_events
        WHERE eip_id = ANY(${eipIds}) AND changed_at >= ${thirtyDaysAgo}
        GROUP BY eip_id, DATE(changed_at)
        ORDER BY day
      `;

      // Build heatmap data structure
      const heatmapData = topEIPs.map(eip => {
        const eipActivity = dailyActivity.filter(d => d.eip_id === eip.eip_id);
        const dailyData: { date: string; value: number }[] = [];
        
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          const dateStr = date.toISOString().split('T')[0];
          const found = eipActivity.find(a => a.day.toISOString().split('T')[0] === dateStr);
          dailyData.push({
            date: dateStr,
            value: found ? Number(found.activity) : 0,
          });
        }

        return {
          eipNumber: eip.eip_number,
          title: eip.title || `EIP-${eip.eip_number}`,
          totalActivity: Number(eip.total_activity),
          dailyActivity: dailyData,
        };
      });

      return heatmapData;
    }),

  // ============================================
  // UTILITY QUERIES
  // ============================================

  getTypes: publicProcedure
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);
      const rows = await prisma.$queryRaw<Array<{ type: string; count: bigint }>>`
        SELECT type, COUNT(*) AS count FROM eip_snapshots WHERE type IS NOT NULL GROUP BY type
      `;
      return rows.map(t => ({ type: t.type, count: Number(t.count) }));
    }),

  getCategories: publicProcedure
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);
      return getCategoryCountsCached();
    }),
}

