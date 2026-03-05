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
        (
          SELECT s.status
          FROM eips e
          JOIN eip_snapshots s ON s.eip_id = e.id
          WHERE e.created_at >= ${startDate} AND e.created_at <= ${endDate} AND s.status IS NOT NULL
          GROUP BY s.status
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) AS most_common_status,
        (
          SELECT s.category
          FROM eips e
          JOIN eip_snapshots s ON s.eip_id = e.id
          WHERE e.created_at >= ${startDate} AND e.created_at <= ${endDate} AND s.category IS NOT NULL
          GROUP BY s.category
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) AS most_active_category,
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
      WITH all_statuses AS (
        SELECT s.status, s.updated_at AS updated_at
        FROM eip_snapshots s
        JOIN eips e ON e.id = s.eip_id
        WHERE s.status IS NOT NULL
          AND e.eip_number <> 0
        UNION ALL
        SELECT COALESCE(r.status, 'Unknown') AS status,
               COALESCE((SELECT MAX(rc.commit_date) FROM rip_commits rc WHERE rc.rip_id = r.id), r.created_at) AS updated_at
        FROM rips r
        WHERE r.rip_number <> 0
      )
      SELECT status, COUNT(*) AS count, MAX(updated_at) AS last_updated
      FROM all_statuses
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
      WITH all_categories AS (
        SELECT s.category AS category
        FROM eip_snapshots s
        JOIN eips e ON e.id = s.eip_id
        WHERE s.category IS NOT NULL
          AND e.eip_number <> 0
        UNION ALL
        SELECT 'RIP'::text AS category
        FROM rips
        WHERE rip_number <> 0
      )
      SELECT category, COUNT(*) AS count
      FROM all_categories
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

const ROLE_FILTER_REPOS = ['all', 'eips', 'ercs', 'rips'] as const;
const ROLE_FILTER_CATEGORIES = ['all', 'governance', 'core', 'erc', 'networking', 'interface', 'meta', 'informational'] as const;
const ROLE_FILTER_TIME_RANGES = ['30d', '90d', '365d', 'all'] as const;
type RoleFilterRepo = (typeof ROLE_FILTER_REPOS)[number];
type RoleFilterCategory = (typeof ROLE_FILTER_CATEGORIES)[number];
type RoleFilterRange = (typeof ROLE_FILTER_TIME_RANGES)[number];

const OFFICIAL_EDITORS_BY_CATEGORY: Record<string, string[]> = {
  governance: ['lightclient', 'SamWilsn', 'xinbenlv', 'g11tech', 'jochem-brouwer'],
  core: ['lightclient', 'SamWilsn', 'g11tech', 'jochem-brouwer'],
  erc: ['SamWilsn', 'xinbenlv'],
  networking: ['lightclient', 'SamWilsn', 'g11tech', 'jochem-brouwer'],
  interface: ['lightclient', 'SamWilsn', 'g11tech', 'jochem-brouwer'],
  meta: ['lightclient', 'SamWilsn', 'xinbenlv', 'g11tech', 'jochem-brouwer'],
  informational: ['lightclient', 'SamWilsn', 'xinbenlv', 'g11tech', 'jochem-brouwer'],
};

function getFromForTimeRange(range: RoleFilterRange): Date | null {
  if (range === 'all') return null;
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 365;
  const from = new Date();
  from.setDate(from.getDate() - days);
  return from;
}

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
      sort: z.enum(['updated_desc', 'updated_asc', 'days_desc', 'days_asc', 'number_asc']).default('updated_desc'),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .handler(async ({ input }) => {
      const filters: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 0;
      const includesRipCategory = (input.categories ?? []).some((category) => category.toLowerCase() === 'rip' || category.toLowerCase() === 'rips');
      const ripEnabled = (!input.types || input.types.length === 0) && (!input.categories || input.categories.length === 0 || includesRipCategory);

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
      const orderByClause = (() => {
        switch (input.sort) {
          case 'updated_asc':
            return 'updated_at ASC NULLS LAST';
          case 'days_desc':
            return 'last_changed_at ASC NULLS LAST';
          case 'days_asc':
            return 'last_changed_at DESC NULLS LAST';
          case 'number_asc':
            return 'eip_number ASC';
          case 'updated_desc':
          default:
            return 'updated_at DESC NULLS LAST';
        }
      })();

      const [items, countResult] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{
          eip_id: number; eip_number: number; title: string | null;
          type: string | null; status: string; category: string | null;
          updated_at: Date | null; last_changed_at: Date | null;
          kind: string;
        }>>(
          `WITH base AS (
            SELECT
              s.eip_id,
              e.eip_number,
              e.title,
              s.type,
              s.status,
              s.category,
              s.updated_at,
              (SELECT MAX(changed_at) FROM eip_status_events ese WHERE ese.eip_id = s.eip_id) AS last_changed_at,
              CASE
                WHEN LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = 'rips' THEN 'RIP'
                WHEN LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = 'ercs' OR s.category = 'ERC' THEN 'ERC'
                ELSE 'EIP'
              END AS kind
            FROM eip_snapshots s
            JOIN eips e ON e.id = s.eip_id
            LEFT JOIN repositories r ON r.id = s.repository_id
            WHERE e.eip_number <> 0 ${filterClause}
            ${ripEnabled ? `UNION ALL
            SELECT
              rip.id AS eip_id,
              rip.rip_number AS eip_number,
              rip.title,
              NULL::text AS type,
              COALESCE(rip.status, 'Unknown') AS status,
              'RIP'::text AS category,
              COALESCE((SELECT MAX(rc.commit_date) FROM rip_commits rc WHERE rc.rip_id = rip.id), rip.created_at) AS updated_at,
              COALESCE((SELECT MAX(rc.commit_date) FROM rip_commits rc WHERE rc.rip_id = rip.id), rip.created_at) AS last_changed_at,
              'RIP'::text AS kind
            FROM rips rip
            WHERE rip.rip_number <> 0
            ${input.status ? ` AND COALESCE(rip.status, 'Unknown') = $1` : ''}` : ''}
          )
          SELECT * FROM base
          ORDER BY ${orderByClause}
          LIMIT ${limit} OFFSET ${offset}`,
          ...params
        ),
        prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `WITH base AS (
            SELECT s.eip_id
            FROM eip_snapshots s
            JOIN eips e ON e.id = s.eip_id
            WHERE e.eip_number <> 0 ${filterClause}
            ${ripEnabled ? `UNION ALL
            SELECT rip.id
            FROM rips rip
            WHERE rip.rip_number <> 0
            ${input.status ? ` AND COALESCE(rip.status, 'Unknown') = $1` : ''}` : ''}
          )
          SELECT COUNT(*) AS count FROM base`,
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
            kind: row.kind === 'RIP' ? 'RIP' : row.kind === 'ERC' ? 'ERC' : 'EIP',
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
  getRoleCounts: publicProcedure
    .input(z.object({
      repo: z.enum(ROLE_FILTER_REPOS).default('all'),
      category: z.enum(ROLE_FILTER_CATEGORIES).default('all'),
      timeRange: z.enum(ROLE_FILTER_TIME_RANGES).default('90d'),
    }).optional())
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const repo = input?.repo ?? 'all';
      const category = input?.category ?? 'all';
      const timeRange = input?.timeRange ?? '90d';
      const from = getFromForTimeRange(timeRange);
      const repoFilter = repo === 'all' ? null : repo;
      const categoryFilter = category === 'all' ? null : category;

      const rows = await prisma.$queryRaw<Array<{
        role: string;
        unique_actors: bigint;
        total_actions: bigint;
      }>>`
        WITH filtered AS (
          SELECT ca.*
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE (${from}::timestamp IS NULL OR ca.occurred_at >= ${from})
            AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
            AND (
              ${categoryFilter}::text IS NULL
              OR EXISTS (
                SELECT 1
                FROM pull_request_eips pre
                JOIN eips e ON e.eip_number = pre.eip_number
                JOIN eip_snapshots s ON s.eip_id = e.id
                WHERE pre.pr_number = ca.pr_number
                  AND pre.repository_id = ca.repository_id
                  AND LOWER(COALESCE(s.category, '')) = ${categoryFilter}
              )
            )
            AND ca.actor NOT LIKE '%[bot]%'
            AND ca.actor NOT LIKE '%-bot'
            AND LOWER(ca.actor) NOT LIKE '%bot'
            AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
        )
        SELECT role, COUNT(DISTINCT actor) AS unique_actors, COUNT(*) AS total_actions
        FROM filtered
        WHERE role IS NOT NULL
        GROUP BY role
      `;

      return rows.map(r => ({
        role: r.role,
        uniqueActors: Number(r.unique_actors),
        totalActions: Number(r.total_actions),
      }));
    }),

  getRoleLeaderboard: optionalAuthProcedure
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']).optional(),
      repo: z.enum(ROLE_FILTER_REPOS).default('all'),
      category: z.enum(ROLE_FILTER_CATEGORIES).default('all'),
      timeRange: z.enum(ROLE_FILTER_TIME_RANGES).default('90d'),
      actor: z.string().trim().min(1).optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .handler(async ({ input }) => {
      const from = getFromForTimeRange(input.timeRange);
      const repoFilter = input.repo === 'all' ? null : input.repo;
      const categoryFilter = input.category === 'all' ? null : input.category;

      const rows = await prisma.$queryRaw<Array<{
        actor: string;
        primary_role: string | null;
        total_actions: bigint;
        prs_touched: bigint;
        prs_created: bigint;
        prs_merged: bigint;
        comments: bigint;
        reviews: bigint;
        last_activity: Date | null;
      }>>`
        WITH filtered AS (
          SELECT ca.*
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE (${from}::timestamp IS NULL OR ca.occurred_at >= ${from})
            AND (${input.role ?? null}::text IS NULL OR UPPER(COALESCE(ca.role, '')) = ${input.role ?? null})
            AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
            AND (${input.actor ?? null}::text IS NULL OR LOWER(ca.actor) = LOWER(${input.actor ?? null}))
            AND (
              ${categoryFilter}::text IS NULL
              OR EXISTS (
                SELECT 1
                FROM pull_request_eips pre
                JOIN eips e ON e.eip_number = pre.eip_number
                JOIN eip_snapshots s ON s.eip_id = e.id
                WHERE pre.pr_number = ca.pr_number
                  AND pre.repository_id = ca.repository_id
                  AND LOWER(COALESCE(s.category, '')) = ${categoryFilter}
              )
            )
            AND ca.actor NOT LIKE '%[bot]%'
            AND ca.actor NOT LIKE '%-bot'
            AND LOWER(ca.actor) NOT LIKE '%bot'
            AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
        )
        SELECT
          f.actor,
          (ARRAY_REMOVE(ARRAY_AGG(f.role ORDER BY f.occurred_at DESC), NULL))[1] AS primary_role,
          COUNT(*) AS total_actions,
          COUNT(DISTINCT f.pr_number) AS prs_touched,
          COUNT(DISTINCT CASE WHEN LOWER(COALESCE(f.action_type, '')) = 'opened' THEN f.pr_number END) AS prs_created,
          COUNT(DISTINCT CASE WHEN LOWER(COALESCE(f.action_type, '')) = 'merged' THEN f.pr_number END) AS prs_merged,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(f.action_type, '')) IN ('commented', 'issue_comment')) AS comments,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(f.action_type, '')) = 'reviewed' OR UPPER(COALESCE(f.role, '')) IN ('EDITOR', 'REVIEWER')) AS reviews,
          MAX(f.occurred_at) AS last_activity
        FROM filtered f
        GROUP BY f.actor
        ORDER BY total_actions DESC, last_activity DESC NULLS LAST
        LIMIT ${input.limit}
      `;

      return rows.map((entry, index) => ({
        rank: index + 1,
        actor: entry.actor,
        totalScore: Number(entry.total_actions),
        prsReviewed: Number(entry.reviews),
        comments: Number(entry.comments),
        prsCreated: Number(entry.prs_created),
        prsMerged: Number(entry.prs_merged),
        avgResponseHours: null,
        lastActivity: entry.last_activity?.toISOString() || null,
        role: entry.primary_role,
        prsTouched: Number(entry.prs_touched),
      }));
    }),

  getTopActorsByRole: optionalAuthProcedure
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']),
      repo: z.enum(ROLE_FILTER_REPOS).default('all'),
      category: z.enum(ROLE_FILTER_CATEGORIES).default('all'),
      timeRange: z.enum(ROLE_FILTER_TIME_RANGES).default('90d'),
      limit: z.number().min(1).max(10).default(3),
    }))
    .handler(async ({ input }) => {
      const from = getFromForTimeRange(input.timeRange);
      const repoFilter = input.repo === 'all' ? null : input.repo;
      const categoryFilter = input.category === 'all' ? null : input.category;

      const topActors = await prisma.$queryRaw<Array<{
        actor: string;
        actions: bigint;
      }>>`
        SELECT ca.actor, COUNT(*) as actions
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE UPPER(COALESCE(ca.role, '')) = ${input.role}
          AND (${from}::timestamp IS NULL OR ca.occurred_at >= ${from})
          AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
          AND (
            ${categoryFilter}::text IS NULL
            OR EXISTS (
              SELECT 1
              FROM pull_request_eips pre
              JOIN eips e ON e.eip_number = pre.eip_number
              JOIN eip_snapshots s ON s.eip_id = e.id
              WHERE pre.pr_number = ca.pr_number
                AND pre.repository_id = ca.repository_id
                AND LOWER(COALESCE(s.category, '')) = ${categoryFilter}
            )
          )
          AND ca.actor NOT LIKE '%[bot]%'
          AND ca.actor NOT LIKE '%-bot'
          AND LOWER(ca.actor) NOT LIKE '%bot'
        GROUP BY ca.actor
        ORDER BY actions DESC
        LIMIT ${input.limit}
      `;

      return topActors.map(a => ({ actor: a.actor, actions: Number(a.actions) }));
    }),

  getRoleActivityTimeline: optionalAuthProcedure
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']).optional(),
      repo: z.enum(ROLE_FILTER_REPOS).default('all'),
      category: z.enum(ROLE_FILTER_CATEGORIES).default('all'),
      timeRange: z.enum(ROLE_FILTER_TIME_RANGES).default('90d'),
      actor: z.string().trim().min(1).optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const from = getFromForTimeRange(input.timeRange);
      const repoFilter = input.repo === 'all' ? null : input.repo;
      const categoryFilter = input.category === 'all' ? null : input.category;

      const events = await prisma.$queryRaw<Array<{
        id: bigint;
        actor: string;
        role: string | null;
        event_type: string;
        pr_number: number;
        occurred_at: Date;
        github_id: string | null;
        repo_name: string | null;
      }>>`
        SELECT
          ca.id,
          ca.actor,
          ca.role,
          UPPER(COALESCE(ca.action_type, 'ACTIVITY')) AS event_type,
          ca.pr_number,
          ca.occurred_at,
          NULL::text AS github_id,
          r.name AS repo_name
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE (${from}::timestamp IS NULL OR ca.occurred_at >= ${from})
          AND (${input.role ?? null}::text IS NULL OR UPPER(COALESCE(ca.role, '')) = ${input.role ?? null})
          AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
          AND (${input.actor ?? null}::text IS NULL OR LOWER(ca.actor) = LOWER(${input.actor ?? null}))
          AND (
            ${categoryFilter}::text IS NULL
            OR EXISTS (
              SELECT 1
              FROM pull_request_eips pre
              JOIN eips e ON e.eip_number = pre.eip_number
              JOIN eip_snapshots s ON s.eip_id = e.id
              WHERE pre.pr_number = ca.pr_number
                AND pre.repository_id = ca.repository_id
                AND LOWER(COALESCE(s.category, '')) = ${categoryFilter}
            )
          )
          AND ca.actor NOT LIKE '%[bot]%'
          AND ca.actor NOT LIKE '%-bot'
          AND LOWER(ca.actor) NOT LIKE '%bot'
          AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
        ORDER BY ca.occurred_at DESC
        LIMIT ${input.limit}
      `;

      let normalized = events.map(e => ({
        id: e.id.toString(),
        actor: e.actor,
        role: e.role,
        eventType: e.event_type,
        prNumber: e.pr_number,
        createdAt: e.occurred_at.toISOString(),
        githubId: e.github_id,
        repoName: e.repo_name || 'ethereum/EIPs',
      }));

      // Fallback when category linkage is sparse (e.g. pull_request_eips not fully populated)
      if (normalized.length === 0 && categoryFilter) {
        const fallback = await prisma.$queryRaw<Array<{
          id: bigint;
          actor: string;
          role: string | null;
          event_type: string;
          pr_number: number;
          occurred_at: Date;
          repo_name: string | null;
        }>>`
          SELECT
            ca.id,
            ca.actor,
            ca.role,
            UPPER(COALESCE(ca.action_type, 'ACTIVITY')) AS event_type,
            ca.pr_number,
            ca.occurred_at,
            r.name AS repo_name
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE (${from}::timestamp IS NULL OR ca.occurred_at >= ${from})
            AND (${input.role ?? null}::text IS NULL OR UPPER(COALESCE(ca.role, '')) = ${input.role ?? null})
            AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
            AND (${input.actor ?? null}::text IS NULL OR LOWER(ca.actor) = LOWER(${input.actor ?? null}))
            AND ca.actor NOT LIKE '%[bot]%'
            AND ca.actor NOT LIKE '%-bot'
            AND LOWER(ca.actor) NOT LIKE '%bot'
            AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
          ORDER BY ca.occurred_at DESC
          LIMIT ${input.limit}
        `;
        normalized = fallback.map(e => ({
          id: e.id.toString(),
          actor: e.actor,
          role: e.role,
          eventType: e.event_type,
          prNumber: e.pr_number,
          createdAt: e.occurred_at.toISOString(),
          githubId: null,
          repoName: e.repo_name || 'ethereum/EIPs',
        }));
      }

      // Final fallback to pr_events if contributor_activity is missing/sparse.
      if (normalized.length === 0) {
        const fromDate = from;
        const fallbackEvents = await prisma.$queryRaw<Array<{
          id: bigint;
          actor: string;
          actor_role: string | null;
          event_type: string;
          pr_number: number;
          created_at: Date;
          github_id: string | null;
          repo_name: string | null;
        }>>`
          SELECT
            pe.id,
            pe.actor,
            pe.actor_role,
            pe.event_type,
            pe.pr_number,
            pe.created_at,
            pe.github_id,
            r.name AS repo_name
          FROM pr_events pe
          LEFT JOIN repositories r ON r.id = pe.repository_id
          WHERE (${fromDate}::timestamp IS NULL OR pe.created_at >= ${fromDate})
            AND (${input.role ?? null}::text IS NULL OR UPPER(COALESCE(pe.actor_role, '')) = ${input.role ?? null})
            AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
            AND (${input.actor ?? null}::text IS NULL OR LOWER(pe.actor) = LOWER(${input.actor ?? null}))
            AND pe.actor NOT LIKE '%[bot]%'
            AND pe.actor NOT LIKE '%-bot'
            AND LOWER(pe.actor) NOT LIKE '%bot'
            AND pe.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
          ORDER BY pe.created_at DESC
          LIMIT ${input.limit}
        `;

        normalized = fallbackEvents.map((e) => ({
          id: e.id.toString(),
          actor: e.actor,
          role: e.actor_role,
          eventType: String(e.event_type || '').toUpperCase(),
          prNumber: e.pr_number,
          createdAt: e.created_at.toISOString(),
          githubId: e.github_id,
          repoName: e.repo_name || 'ethereum/EIPs',
        }));
      }

      return normalized;
    }),

  getRoleActivitySparkline: optionalAuthProcedure
    .input(z.object({
      role: z.enum(['EDITOR', 'REVIEWER', 'CONTRIBUTOR']).optional(),
      repo: z.enum(ROLE_FILTER_REPOS).default('all'),
      category: z.enum(ROLE_FILTER_CATEGORIES).default('all'),
      timeRange: z.enum(ROLE_FILTER_TIME_RANGES).default('365d'),
      actor: z.string().trim().min(1).optional(),
    }))
    .handler(async ({ input }) => {
      const from = getFromForTimeRange(input.timeRange);
      const repoFilter = input.repo === 'all' ? null : input.repo;
      const categoryFilter = input.category === 'all' ? null : input.category;

      let monthlyData = await prisma.$queryRaw<Array<{
        year_month: string;
        count: bigint;
      }>>`
        SELECT
          TO_CHAR(ca.occurred_at, 'YYYY-MM') as year_month,
          COUNT(*) as count
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE (${from}::timestamp IS NULL OR ca.occurred_at >= ${from})
          AND (${input.role ?? null}::text IS NULL OR UPPER(COALESCE(ca.role, '')) = ${input.role ?? null})
          AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
          AND (${input.actor ?? null}::text IS NULL OR LOWER(ca.actor) = LOWER(${input.actor ?? null}))
          AND (
            ${categoryFilter}::text IS NULL
            OR EXISTS (
              SELECT 1
              FROM pull_request_eips pre
              JOIN eips e ON e.eip_number = pre.eip_number
              JOIN eip_snapshots s ON s.eip_id = e.id
              WHERE pre.pr_number = ca.pr_number
                AND pre.repository_id = ca.repository_id
                AND LOWER(COALESCE(s.category, '')) = ${categoryFilter}
            )
          )
          AND ca.actor NOT LIKE '%[bot]%'
          AND ca.actor NOT LIKE '%-bot'
          AND LOWER(ca.actor) NOT LIKE '%bot'
          AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
        GROUP BY TO_CHAR(ca.occurred_at, 'YYYY-MM')
        ORDER BY year_month
      `;

      if (monthlyData.length === 0 && categoryFilter) {
        monthlyData = await prisma.$queryRaw<Array<{
          year_month: string;
          count: bigint;
        }>>`
          SELECT
            TO_CHAR(ca.occurred_at, 'YYYY-MM') as year_month,
            COUNT(*) as count
          FROM contributor_activity ca
          LEFT JOIN repositories r ON r.id = ca.repository_id
          WHERE (${from}::timestamp IS NULL OR ca.occurred_at >= ${from})
            AND (${input.role ?? null}::text IS NULL OR UPPER(COALESCE(ca.role, '')) = ${input.role ?? null})
            AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
            AND (${input.actor ?? null}::text IS NULL OR LOWER(ca.actor) = LOWER(${input.actor ?? null}))
            AND ca.actor NOT LIKE '%[bot]%'
            AND ca.actor NOT LIKE '%-bot'
            AND LOWER(ca.actor) NOT LIKE '%bot'
            AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
          GROUP BY TO_CHAR(ca.occurred_at, 'YYYY-MM')
          ORDER BY year_month
        `;
      }

      // Final fallback to pr_events monthly buckets when contributor_activity is sparse.
      if (monthlyData.length === 0) {
        const peMonthly = await prisma.$queryRaw<Array<{
          year_month: string;
          count: bigint;
        }>>`
          SELECT
            TO_CHAR(pe.created_at, 'YYYY-MM') as year_month,
            COUNT(*) as count
          FROM pr_events pe
          LEFT JOIN repositories r ON r.id = pe.repository_id
          WHERE (${from}::timestamp IS NULL OR pe.created_at >= ${from})
            AND (${input.role ?? null}::text IS NULL OR UPPER(COALESCE(pe.actor_role, '')) = ${input.role ?? null})
            AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
            AND (${input.actor ?? null}::text IS NULL OR LOWER(pe.actor) = LOWER(${input.actor ?? null}))
            AND pe.actor NOT LIKE '%[bot]%'
            AND pe.actor NOT LIKE '%-bot'
            AND LOWER(pe.actor) NOT LIKE '%bot'
            AND pe.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
          GROUP BY TO_CHAR(pe.created_at, 'YYYY-MM')
          ORDER BY year_month
        `;
        monthlyData = peMonthly;
      }

      const points = monthlyData.map(m => ({
        month: m.year_month,
        count: Number(m.count),
      }));

      // Fill month buckets so chart never appears blank for sparse windows.
      const now = new Date();
      const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      const byMonth = new Map(points.map((p) => [p.month, p.count]));
      const filled: Array<{ month: string; count: number }> = [];
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        filled.push({ month: key, count: byMonth.get(key) ?? 0 });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      return filled;
    }),

  getEditorsByCategory: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(ROLE_FILTER_REPOS).default('all'),
      category: z.enum(ROLE_FILTER_CATEGORIES).default('all'),
      timeRange: z.enum(ROLE_FILTER_TIME_RANGES).default('90d'),
    }))
    .handler(async ({ input }) => {
      const from = getFromForTimeRange(input.timeRange);
      const repoFilter = input.repo === 'all' ? null : input.repo;
      const categoryFilter = input.category === 'all' ? null : input.category;
      const categories = Object.keys(OFFICIAL_EDITORS_BY_CATEGORY)
        .filter(c => !categoryFilter || c === categoryFilter);
      const editors = Array.from(new Set(categories.flatMap(c => OFFICIAL_EDITORS_BY_CATEGORY[c] ?? [])));

      if (editors.length === 0) return [];

      const activity = await prisma.$queryRaw<Array<{
        actor: string;
        last_activity: Date | null;
        actions: bigint;
        reviews: bigint;
        comments: bigint;
        prs_touched: bigint;
      }>>`
        SELECT
          ca.actor,
          MAX(ca.occurred_at) AS last_activity,
          COUNT(*) AS actions,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(ca.action_type, '')) = 'reviewed' OR UPPER(COALESCE(ca.role, '')) IN ('EDITOR', 'REVIEWER')) AS reviews,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(ca.action_type, '')) IN ('commented', 'issue_comment')) AS comments,
          COUNT(DISTINCT ca.pr_number) AS prs_touched
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE ca.actor = ANY(${editors})
          AND (${from}::timestamp IS NULL OR ca.occurred_at >= ${from})
          AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
          AND ca.actor NOT LIKE '%[bot]%'
          AND ca.actor NOT LIKE '%-bot'
          AND LOWER(ca.actor) NOT LIKE '%bot'
          AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
        GROUP BY ca.actor
      `;

      const activityMap = new Map(activity.map((a) => [
        a.actor.toLowerCase(),
        {
          lastActivity: a.last_activity?.toISOString() ?? null,
          actions: Number(a.actions),
          reviews: Number(a.reviews),
          comments: Number(a.comments),
          prsTouched: Number(a.prs_touched),
        },
      ]));

      return categories.map((category) => ({
        category,
        editors: (OFFICIAL_EDITORS_BY_CATEGORY[category] ?? []).map((actor) => {
          const metrics = activityMap.get(actor.toLowerCase());
          return {
            actor,
            lastActivity: metrics?.lastActivity ?? null,
            actions: metrics?.actions ?? 0,
            reviews: metrics?.reviews ?? 0,
            comments: metrics?.comments ?? 0,
            prsTouched: metrics?.prsTouched ?? 0,
          };
        }),
      }));
    }),

  getRoleAuthors: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(ROLE_FILTER_REPOS).default('all'),
      category: z.enum(ROLE_FILTER_CATEGORIES).default('all'),
      timeRange: z.enum(ROLE_FILTER_TIME_RANGES).default('365d'),
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
    }))
    .handler(async ({ input }) => {
      const from = getFromForTimeRange(input.timeRange);
      const repoFilter = input.repo === 'all' ? null : input.repo;
      const categoryFilter = input.category === 'all' ? null : input.category;

      const [rows, totalRows] = await Promise.all([
        prisma.$queryRaw<Array<{
          author: string;
          eips_created: bigint;
          last_created_at: Date | null;
        }>>`
          WITH expanded AS (
            SELECT
              TRIM(a.author_name) AS author_name,
              e.created_at
            FROM eips e
            JOIN eip_snapshots s ON s.eip_id = e.id
            LEFT JOIN repositories r ON r.id = s.repository_id
            CROSS JOIN LATERAL regexp_split_to_table(COALESCE(e.author, ''), '\\s*,\\s*|\\s+and\\s+') AS a(author_name)
            WHERE COALESCE(e.eip_number, 0) <> 0
              AND TRIM(a.author_name) <> ''
              AND (${from}::timestamp IS NULL OR e.created_at >= ${from})
              AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
              AND (${categoryFilter}::text IS NULL OR LOWER(COALESCE(s.category, '')) = ${categoryFilter})
          )
          SELECT
            author_name AS author,
            COUNT(*) AS eips_created,
            MAX(created_at) AS last_created_at
          FROM expanded
          GROUP BY author_name
          ORDER BY eips_created DESC, last_created_at DESC NULLS LAST
          LIMIT ${input.limit}
          OFFSET ${input.offset}
        `,
        prisma.$queryRaw<Array<{ total: bigint }>>`
          WITH expanded AS (
            SELECT DISTINCT TRIM(a.author_name) AS author_name
            FROM eips e
            JOIN eip_snapshots s ON s.eip_id = e.id
            LEFT JOIN repositories r ON r.id = s.repository_id
            CROSS JOIN LATERAL regexp_split_to_table(COALESCE(e.author, ''), '\\s*,\\s*|\\s+and\\s+') AS a(author_name)
            WHERE COALESCE(e.eip_number, 0) <> 0
              AND TRIM(a.author_name) <> ''
              AND (${from}::timestamp IS NULL OR e.created_at >= ${from})
              AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
              AND (${categoryFilter}::text IS NULL OR LOWER(COALESCE(s.category, '')) = ${categoryFilter})
          )
          SELECT COUNT(*) AS total FROM expanded
        `,
      ]);

      const items = rows.map((r, index) => ({
        rank: input.offset + index + 1,
        author: r.author,
        eipsCreated: Number(r.eips_created),
        lastCreatedAt: r.last_created_at?.toISOString() ?? null,
      }));
      const total = Number(totalRows[0]?.total ?? 0);

      return {
        items,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  getRoleAuthorCount: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(ROLE_FILTER_REPOS).default('all'),
      category: z.enum(ROLE_FILTER_CATEGORIES).default('all'),
      timeRange: z.enum(ROLE_FILTER_TIME_RANGES).default('365d'),
    }))
    .handler(async ({ input }) => {
      const from = getFromForTimeRange(input.timeRange);
      const repoFilter = input.repo === 'all' ? null : input.repo;
      const categoryFilter = input.category === 'all' ? null : input.category;

      const rows = await prisma.$queryRaw<Array<{ author_count: bigint }>>`
        WITH expanded AS (
          SELECT DISTINCT TRIM(a.author_name) AS author_name
          FROM eips e
          JOIN eip_snapshots s ON s.eip_id = e.id
          LEFT JOIN repositories r ON r.id = s.repository_id
          CROSS JOIN LATERAL regexp_split_to_table(COALESCE(e.author, ''), '\\s*,\\s*|\\s+and\\s+') AS a(author_name)
          WHERE COALESCE(e.eip_number, 0) <> 0
            AND TRIM(a.author_name) <> ''
            AND (${from}::timestamp IS NULL OR e.created_at >= ${from})
            AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
            AND (${categoryFilter}::text IS NULL OR LOWER(COALESCE(s.category, '')) = ${categoryFilter})
        )
        SELECT COUNT(*) AS author_count FROM expanded
      `;

      return { count: Number(rows[0]?.author_count ?? 0) };
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
