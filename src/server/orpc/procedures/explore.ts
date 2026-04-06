import { optionalAuthProcedure, publicProcedure, checkAPIToken } from './types'
import {
  CANONICAL_EIP_EDITOR_LOWER,
  CANONICAL_EIP_REVIEWER_LOWER,
  OFFICIAL_EDITORS_BY_CATEGORY,
} from '@/data/eip-contributor-roles'
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
        SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int AS y FROM eips WHERE created_at IS NOT NULL AND eip_number NOT IN (2512, 3297, 1047)
        UNION
        SELECT DISTINCT EXTRACT(YEAR FROM changed_at)::int FROM eip_status_events
        UNION
        SELECT DISTINCT EXTRACT(YEAR FROM p.created_at)::int
        FROM pull_requests p
        JOIN pull_request_eips pre ON pre.pr_number = p.pr_number AND pre.repository_id = p.repository_id
        JOIN eips e ON e.eip_number = pre.eip_number
        WHERE p.created_at IS NOT NULL
          AND e.eip_number NOT IN (2512, 3297, 1047)
      ) years
      LEFT JOIN (SELECT EXTRACT(YEAR FROM created_at)::int AS y, COUNT(*) AS cnt FROM eips WHERE created_at IS NOT NULL AND eip_number NOT IN (2512, 3297, 1047) GROUP BY 1) e ON e.y = years.y
      LEFT JOIN (SELECT EXTRACT(YEAR FROM changed_at)::int AS y, COUNT(*) AS cnt FROM eip_status_events GROUP BY 1) s ON s.y = years.y
      LEFT JOIN (
        SELECT EXTRACT(YEAR FROM p.created_at)::int AS y, COUNT(DISTINCT (p.repository_id, p.pr_number)) AS cnt
        FROM pull_requests p
        JOIN pull_request_eips pre ON pre.pr_number = p.pr_number AND pre.repository_id = p.repository_id
        JOIN eips e ON e.eip_number = pre.eip_number
        WHERE p.created_at IS NOT NULL
          AND e.eip_number NOT IN (2512, 3297, 1047)
        GROUP BY 1
      ) p ON p.y = years.y
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
        (SELECT COUNT(*) FROM eips WHERE created_at >= ${startDate} AND created_at <= ${endDate} AND eip_number NOT IN (2512, 3297, 1047)) AS total_new_eips,
        (
          SELECT s.status
          FROM eips e
          JOIN eip_snapshots s ON s.eip_id = e.id
          WHERE e.created_at >= ${startDate} AND e.created_at <= ${endDate} AND e.eip_number NOT IN (2512, 3297, 1047) AND s.status IS NOT NULL
          GROUP BY s.status
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) AS most_common_status,
        (
          SELECT s.category
          FROM eips e
          JOIN eip_snapshots s ON s.eip_id = e.id
          WHERE e.created_at >= ${startDate} AND e.created_at <= ${endDate} AND e.eip_number NOT IN (2512, 3297, 1047) AND s.category IS NOT NULL
          GROUP BY s.category
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) AS most_active_category,
        (
          SELECT COUNT(DISTINCT (p.repository_id, p.pr_number))
          FROM pull_requests p
          JOIN pull_request_eips pre ON pre.pr_number = p.pr_number AND pre.repository_id = p.repository_id
          JOIN eips e ON e.eip_number = pre.eip_number
          WHERE p.created_at >= ${startDate}
            AND p.created_at <= ${endDate}
            AND e.eip_number NOT IN (2512, 3297, 1047)
        ) AS total_prs
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
        FROM eips WHERE created_at >= ${startDate} AND created_at <= ${endDate} AND eip_number NOT IN (2512, 3297, 1047)
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
  async (category: string | null) => {
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
          AND e.eip_number NOT IN (2512, 3297, 1047)
          AND (
            ${category}::text IS NULL
            OR COALESCE(NULLIF(TRIM(s.category), ''), NULLIF(TRIM(s.type), ''), 'Unknown') = ${category}
          )
        UNION ALL
        SELECT COALESCE(r.status, 'Unknown') AS status,
               COALESCE((SELECT MAX(rc.commit_date) FROM rip_commits rc WHERE rc.rip_id = r.id), r.created_at) AS updated_at
        FROM rips r
        WHERE r.rip_number <> 0
          AND (
            ${category}::text IS NULL
            OR LOWER(${category}) IN ('rip', 'rips')
          )
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
        SELECT COALESCE(NULLIF(TRIM(s.category), ''), NULLIF(TRIM(s.type), ''), 'Unknown') AS category
        FROM eip_snapshots s
        JOIN eips e ON e.id = s.eip_id
        WHERE e.eip_number NOT IN (2512, 3297, 1047)
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
type DetailDimension = 'status' | 'category' | 'repo';

const DETAIL_DIMENSIONS = ['status', 'category', 'repo'] as const;

function slugifyDetailLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function resolveDetailTarget(dimension: DetailDimension, slug: string): Promise<{
  valid: boolean;
  label: string;
  repoKey: 'eips' | 'ercs' | 'rips' | null;
}> {
  const normalizedSlug = slugifyDetailLabel(slug);
  if (dimension === 'repo') {
    const repoMap: Record<string, { label: string; repoKey: 'eips' | 'ercs' | 'rips' }> = {
      eips: { label: 'EIPs', repoKey: 'eips' },
      ercs: { label: 'ERCs', repoKey: 'ercs' },
      rips: { label: 'RIPs', repoKey: 'rips' },
    };
    const hit = repoMap[normalizedSlug];
    if (!hit) return { valid: false, label: slug, repoKey: null };
    return { valid: true, label: hit.label, repoKey: hit.repoKey };
  }

  if (dimension === 'status') {
    const statuses = await getStatusCountsCached(null);
    const hit = statuses.find((row) => slugifyDetailLabel(row.status) === normalizedSlug);
    if (!hit) return { valid: false, label: slug, repoKey: null };
    return { valid: true, label: hit.status, repoKey: null };
  }

  const categories = await getCategoryCountsCached();
  const hit = categories.find((row) => slugifyDetailLabel(row.category) === normalizedSlug);
  if (!hit) return { valid: false, label: slug, repoKey: null };
  return { valid: true, label: hit.category, repoKey: null };
}

function repoKeyToGithubRepo(repoKey: 'eips' | 'ercs' | 'rips') {
  if (repoKey === 'ercs') return 'ethereum/ERCs';
  if (repoKey === 'rips') return 'ethereum/RIPs';
  return 'ethereum/EIPs';
}

const CANONICAL_EDITOR_SET = new Set(CANONICAL_EIP_EDITOR_LOWER);
const CANONICAL_REVIEWER_SET = new Set(CANONICAL_EIP_REVIEWER_LOWER);

function resolveCanonicalRole(actor: string | null | undefined): 'EDITOR' | 'REVIEWER' | 'CONTRIBUTOR' {
  const key = String(actor ?? '').trim().toLowerCase();
  if (!key) return 'CONTRIBUTOR';
  if (CANONICAL_EDITOR_SET.has(key)) return 'EDITOR';
  if (CANONICAL_REVIEWER_SET.has(key)) return 'REVIEWER';
  return 'CONTRIBUTOR';
}

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
        WITH status_touched AS (
          SELECT
            EXTRACT(MONTH FROM changed_at)::int AS month,
            eip_id::text AS proposal_key
          FROM eip_status_events
          WHERE changed_at >= ${startDate} AND changed_at <= ${endDate}
        ),
        created_touched AS (
          SELECT
            EXTRACT(MONTH FROM created_at)::int AS month,
            id::text AS proposal_key
          FROM eips
          WHERE created_at >= ${startDate} AND created_at <= ${endDate}
            AND eip_number NOT IN (2512, 3297, 1047)
        ),
        all_touched AS (
          SELECT month, proposal_key FROM status_touched
          UNION
          SELECT month, proposal_key FROM created_touched
        )
        SELECT
          month,
          COUNT(DISTINCT proposal_key)::bigint AS count
        FROM all_touched
        GROUP BY month
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
      mode: z.enum(['new_eips', 'status_changes', 'pr_activity']).default('new_eips'),
      q: z.string().optional(),
      status: z.string().optional(),
      category: z.string().optional(),
      type: z.string().optional(),
      limit: z.number().min(1).max(5000).default(50),
      offset: z.number().min(0).default(0),
    }))
    .handler(async ({ input }) => {
      const startDate = new Date(`${input.year}-01-01`);
      const endDate = new Date(`${input.year}-12-31`);
      const params: unknown[] = [];
      let paramIdx = 0;
      const whereParts: string[] = [];

      if (input.q?.trim()) {
        paramIdx++;
        params.push(`%${input.q.trim()}%`);
        whereParts.push(`(CAST(base.eip_number AS TEXT) ILIKE $${paramIdx} OR COALESCE(base.title, '') ILIKE $${paramIdx} OR COALESCE(base.author, '') ILIKE $${paramIdx})`);
      }
      if (input.status?.trim()) {
        paramIdx++;
        params.push(input.status.trim());
        whereParts.push(`COALESCE(base.status, '') = $${paramIdx}`);
      }
      if (input.category?.trim()) {
        paramIdx++;
        params.push(input.category.trim());
        whereParts.push(`COALESCE(base.category, '') = $${paramIdx}`);
      }
      if (input.type?.trim()) {
        paramIdx++;
        params.push(input.type.trim());
        whereParts.push(`COALESCE(base.type, '') = $${paramIdx}`);
      }

      const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

      const limit = input.limit;
      const offset = input.offset;

      const [items, countResult] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{
          id: number;
          eip_number: number;
          title: string | null;
          author: string | null;
          type: string | null;
          status: string;
          category: string | null;
          created_at: Date | null;
          updated_at: Date | null;
          metric_count: bigint;
          metric_latest_at: Date | null;
          pr_number: number | null;
          pr_repo: string | null;
          pr_state: string | null;
          linked_eip_numbers: number[] | null;
        }>>(
          `
          WITH base AS (
            ${input.mode === 'new_eips'
              ? `
              SELECT
                e.id,
                e.eip_number,
                e.title,
                e.author,
                s.type,
                COALESCE(s.status, 'Unknown') AS status,
                s.category,
                e.created_at,
                s.updated_at,
                1::bigint AS metric_count,
                e.created_at AS metric_latest_at
              FROM eips e
              LEFT JOIN eip_snapshots s ON e.id = s.eip_id
              WHERE e.created_at >= '${startDate.toISOString()}'
                AND e.created_at <= '${endDate.toISOString()}'
                AND e.eip_number NOT IN (2512, 3297, 1047)
              `
              : input.mode === 'status_changes'
                ? `
                SELECT
                  e.id,
                  e.eip_number,
                  e.title,
                  e.author,
                  s.type,
                  COALESCE(s.status, 'Unknown') AS status,
                  s.category,
                  e.created_at,
                  s.updated_at,
                  COUNT(*)::bigint AS metric_count,
                  MAX(ese.changed_at) AS metric_latest_at
                FROM eip_status_events ese
                JOIN eips e ON e.id = ese.eip_id
                LEFT JOIN eip_snapshots s ON s.eip_id = e.id
                WHERE ese.changed_at >= '${startDate.toISOString()}'
                  AND ese.changed_at <= '${endDate.toISOString()}'
                  AND e.eip_number NOT IN (2512, 3297, 1047)
                GROUP BY e.id, e.eip_number, e.title, e.author, s.type, s.status, s.category, e.created_at, s.updated_at
                `
                : `
                SELECT
                  (p.repository_id * 1000000 + p.pr_number)::int AS id,
                  COALESCE(linked.primary_eip_number, p.pr_number) AS eip_number,
                  p.title,
                  p.author,
                  linked.type,
                  COALESCE(linked.status, 'Unknown') AS status,
                  linked.category,
                  p.created_at,
                  COALESCE(p.merged_at, p.closed_at, p.updated_at, p.created_at) AS updated_at,
                  1::bigint AS metric_count,
                  COALESCE(p.merged_at, p.closed_at, p.updated_at, p.created_at) AS metric_latest_at,
                  p.pr_number,
                  LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) AS pr_repo,
                  COALESCE(p.state, 'unknown') AS pr_state,
                  ARRAY_REMOVE(ARRAY_AGG(DISTINCT pre.eip_number), NULL) AS linked_eip_numbers
                FROM pull_requests p
                JOIN pull_request_eips pre ON pre.pr_number = p.pr_number AND pre.repository_id = p.repository_id
                LEFT JOIN repositories r ON r.id = p.repository_id
                LEFT JOIN LATERAL (
                  SELECT
                    pre2.eip_number AS primary_eip_number,
                    s2.type,
                    s2.status,
                    s2.category
                  FROM pull_request_eips pre2
                  JOIN eips e2 ON e2.eip_number = pre2.eip_number
                  LEFT JOIN eip_snapshots s2 ON s2.eip_id = e2.id
                  WHERE pre2.pr_number = p.pr_number
                    AND pre2.repository_id = p.repository_id
                    AND e2.eip_number NOT IN (2512, 3297, 1047)
                  ORDER BY pre2.eip_number ASC
                  LIMIT 1
                ) linked ON TRUE
                WHERE p.created_at >= '${startDate.toISOString()}'
                  AND p.created_at <= '${endDate.toISOString()}'
                  AND EXISTS (
                    SELECT 1
                    FROM pull_request_eips pre3
                    JOIN eips e3 ON e3.eip_number = pre3.eip_number
                    WHERE pre3.pr_number = p.pr_number
                      AND pre3.repository_id = p.repository_id
                      AND e3.eip_number NOT IN (2512, 3297, 1047)
                  )
                GROUP BY
                  p.repository_id, p.pr_number, p.title, p.author, p.created_at, p.merged_at, p.closed_at, p.updated_at, p.state,
                  r.name,
                  linked.primary_eip_number, linked.type, linked.status, linked.category
                `
            }
          )
          SELECT *
          FROM base
          ${whereClause}
          ORDER BY metric_latest_at DESC NULLS LAST, eip_number ASC
          LIMIT ${limit} OFFSET ${offset}
          `,
          ...params
        ),
        prisma.$queryRawUnsafe<Array<{ count: bigint; metric_total: bigint }>>(
          `
          WITH base AS (
            ${input.mode === 'new_eips'
              ? `
              SELECT
                e.id,
                e.eip_number,
                e.title,
                e.author,
                s.type,
                COALESCE(s.status, 'Unknown') AS status,
                s.category,
                e.created_at,
                s.updated_at,
                1::bigint AS metric_count,
                e.created_at AS metric_latest_at
              FROM eips e
              LEFT JOIN eip_snapshots s ON e.id = s.eip_id
              WHERE e.created_at >= '${startDate.toISOString()}'
                AND e.created_at <= '${endDate.toISOString()}'
                AND e.eip_number NOT IN (2512, 3297, 1047)
              `
              : input.mode === 'status_changes'
                ? `
                SELECT
                  e.id,
                  e.eip_number,
                  e.title,
                  e.author,
                  s.type,
                  COALESCE(s.status, 'Unknown') AS status,
                  s.category,
                  e.created_at,
                  s.updated_at,
                  COUNT(*)::bigint AS metric_count,
                  MAX(ese.changed_at) AS metric_latest_at
                FROM eip_status_events ese
                JOIN eips e ON e.id = ese.eip_id
                LEFT JOIN eip_snapshots s ON s.eip_id = e.id
                WHERE ese.changed_at >= '${startDate.toISOString()}'
                  AND ese.changed_at <= '${endDate.toISOString()}'
                  AND e.eip_number NOT IN (2512, 3297, 1047)
                GROUP BY e.id, e.eip_number, e.title, e.author, s.type, s.status, s.category, e.created_at, s.updated_at
                `
                : `
                SELECT
                  (p.repository_id * 1000000 + p.pr_number)::int AS id,
                  COALESCE(linked.primary_eip_number, p.pr_number) AS eip_number,
                  p.title,
                  p.author,
                  linked.type,
                  COALESCE(linked.status, 'Unknown') AS status,
                  linked.category,
                  p.created_at,
                  COALESCE(p.merged_at, p.closed_at, p.updated_at, p.created_at) AS updated_at,
                  1::bigint AS metric_count,
                  COALESCE(p.merged_at, p.closed_at, p.updated_at, p.created_at) AS metric_latest_at,
                  p.pr_number,
                  LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) AS pr_repo,
                  COALESCE(p.state, 'unknown') AS pr_state,
                  ARRAY_REMOVE(ARRAY_AGG(DISTINCT pre.eip_number), NULL) AS linked_eip_numbers
                FROM pull_requests p
                JOIN pull_request_eips pre ON pre.pr_number = p.pr_number AND pre.repository_id = p.repository_id
                LEFT JOIN repositories r ON r.id = p.repository_id
                LEFT JOIN LATERAL (
                  SELECT
                    pre2.eip_number AS primary_eip_number,
                    s2.type,
                    s2.status,
                    s2.category
                  FROM pull_request_eips pre2
                  JOIN eips e2 ON e2.eip_number = pre2.eip_number
                  LEFT JOIN eip_snapshots s2 ON s2.eip_id = e2.id
                  WHERE pre2.pr_number = p.pr_number
                    AND pre2.repository_id = p.repository_id
                    AND e2.eip_number NOT IN (2512, 3297, 1047)
                  ORDER BY pre2.eip_number ASC
                  LIMIT 1
                ) linked ON TRUE
                WHERE p.created_at >= '${startDate.toISOString()}'
                  AND p.created_at <= '${endDate.toISOString()}'
                  AND EXISTS (
                    SELECT 1
                    FROM pull_request_eips pre3
                    JOIN eips e3 ON e3.eip_number = pre3.eip_number
                    WHERE pre3.pr_number = p.pr_number
                      AND pre3.repository_id = p.repository_id
                      AND e3.eip_number NOT IN (2512, 3297, 1047)
                  )
                GROUP BY
                  p.repository_id, p.pr_number, p.title, p.author, p.created_at, p.merged_at, p.closed_at, p.updated_at, p.state,
                  r.name,
                  linked.primary_eip_number, linked.type, linked.status, linked.category
                `
            }
          )
          SELECT COUNT(*) AS count, COALESCE(SUM(metric_count), 0)::bigint AS metric_total
          FROM base
          ${whereClause}
          `,
          ...params
        ),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      const metricTotal = Number(countResult[0]?.metric_total ?? 0);

      return {
        items: items.map(eip => ({
          id: eip.id,
          number: eip.eip_number,
          title: eip.title || `EIP-${eip.eip_number}`,
          author: eip.author || null,
          type: eip.type,
          status: eip.status,
          category: eip.category,
          createdAt: eip.created_at?.toISOString() || null,
          updatedAt: eip.updated_at?.toISOString() || null,
          metricCount: Number(eip.metric_count),
          metricLatestAt: eip.metric_latest_at?.toISOString() || null,
          prNumber: eip.pr_number,
          prRepo: eip.pr_repo,
          prState: eip.pr_state,
          linkedEipNumbers: eip.linked_eip_numbers ?? [],
        })),
        total,
        metricTotal,
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
    .input(z.object({
      category: z.string().optional(),
    }).optional())
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      return getStatusCountsCached(input?.category ?? null);
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
      const normalizedCategoryExpr = `COALESCE(NULLIF(TRIM(s.category), ''), NULLIF(TRIM(s.type), ''), 'Unknown')`;
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
        filters.push(`AND ${normalizedCategoryExpr} IN (${placeholders})`);
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
              ${normalizedCategoryExpr} AS category,
              s.updated_at,
              (SELECT MAX(changed_at) FROM eip_status_events ese WHERE ese.eip_id = s.eip_id) AS last_changed_at,
              CASE
                WHEN LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = 'rips' THEN 'RIP'
                WHEN LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = 'ercs' OR ${normalizedCategoryExpr} = 'ERC' THEN 'ERC'
                ELSE 'EIP'
              END AS kind
            FROM eip_snapshots s
            JOIN eips e ON e.id = s.eip_id
            LEFT JOIN repositories r ON r.id = s.repository_id
            WHERE e.eip_number NOT IN (2512, 3297, 1047) ${filterClause}
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
            WHERE e.eip_number NOT IN (2512, 3297, 1047) ${filterClause}
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
      const cached = await getStatusCountsCached(null);
      const countMap = new Map(cached.map(s => [s.status, s.count]));
      const ordered = statusOrder.map(status => ({ status, count: countMap.get(status) || 0 }));
      const extras = cached
        .filter(s => !statusOrder.includes(s.status))
        .map(s => ({ status: s.status, count: s.count }));
      return [...ordered, ...extras];
    }),

  getDetailOverview: optionalAuthProcedure
    .input(z.object({
      dimension: z.enum(DETAIL_DIMENSIONS),
      slug: z.string().min(1),
    }))
    .handler(async ({ input }) => {
      const target = await resolveDetailTarget(input.dimension, input.slug);
      if (!target.valid) {
        return {
          valid: false,
          dimension: input.dimension,
          slug: slugifyDetailLabel(input.slug),
          label: input.slug,
          total: 0,
          recentChanges30d: 0,
          lastUpdated: null as string | null,
        };
      }

      const params: unknown[] = [];
      const eventParams: unknown[] = [];
      let paramIdx = 1;
      const eipFilters: string[] = ['e.eip_number NOT IN (2512, 3297, 1047)'];
      const eventFilters: string[] = ['e.eip_number NOT IN (2512, 3297, 1047)'];

      if (input.dimension === 'status') {
        eipFilters.push(`COALESCE(NULLIF(s.status, ''), 'Unknown') = $${paramIdx}`);
        eventFilters.push(`COALESCE(NULLIF(s.status, ''), 'Unknown') = $${paramIdx}`);
        params.push(target.label);
        eventParams.push(target.label);
        paramIdx += 1;
      } else if (input.dimension === 'category') {
        eipFilters.push(`COALESCE(NULLIF(TRIM(s.category), ''), NULLIF(TRIM(s.type), ''), 'Unknown') = $${paramIdx}`);
        eventFilters.push(`COALESCE(NULLIF(TRIM(s.category), ''), NULLIF(TRIM(s.type), ''), 'Unknown') = $${paramIdx}`);
        params.push(target.label);
        eventParams.push(target.label);
        paramIdx += 1;
      } else if (input.dimension === 'repo' && target.repoKey) {
        eipFilters.push(`LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = $${paramIdx}`);
        eventFilters.push(`LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = $${paramIdx}`);
        params.push(target.repoKey);
        eventParams.push(target.repoKey);
        paramIdx += 1;
      }

      const includeRipRows =
        (input.dimension === 'status') ||
        (input.dimension === 'category' && ['rip', 'rips'].includes(target.label.toLowerCase())) ||
        (input.dimension === 'repo' && target.repoKey === 'rips');

      const ripWhereParts: string[] = ['rip.rip_number <> 0'];
      if (input.dimension === 'status') {
        ripWhereParts.push(`COALESCE(rip.status, 'Unknown') = $${paramIdx}`);
        params.push(target.label);
        paramIdx += 1;
      }
      const ripWhere = ripWhereParts.join(' AND ');

      const overviewRows = await prisma.$queryRawUnsafe<Array<{ total: bigint; last_updated: Date | null }>>(
        `
        WITH base AS (
          SELECT s.updated_at AS updated_at
          FROM eip_snapshots s
          JOIN eips e ON e.id = s.eip_id
          LEFT JOIN repositories r ON r.id = s.repository_id
          WHERE ${eipFilters.join(' AND ')}
          ${includeRipRows ? `
          UNION ALL
          SELECT COALESCE((SELECT MAX(rc.commit_date) FROM rip_commits rc WHERE rc.rip_id = rip.id), rip.created_at) AS updated_at
          FROM rips rip
          WHERE ${ripWhere}
          ` : ''}
        )
        SELECT COUNT(*)::bigint AS total, MAX(updated_at) AS last_updated
        FROM base
        `,
        ...params
      );

      const recentChangeRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `
        SELECT COUNT(*)::bigint AS count
        FROM eip_status_events se
        JOIN eips e ON e.id = se.eip_id
        LEFT JOIN eip_snapshots s ON s.eip_id = e.id
        LEFT JOIN repositories r ON r.id = se.repository_id
        WHERE se.changed_at >= NOW() - INTERVAL '30 days'
          AND ${eventFilters.join(' AND ')}
        `,
        ...eventParams
      );

      return {
        valid: true,
        dimension: input.dimension,
        slug: slugifyDetailLabel(input.slug),
        label: target.label,
        total: Number(overviewRows[0]?.total ?? 0),
        recentChanges30d: Number(recentChangeRows[0]?.count ?? 0),
        lastUpdated: overviewRows[0]?.last_updated?.toISOString() ?? null,
      };
    }),

  getDetailTimeline: optionalAuthProcedure
    .input(z.object({
      dimension: z.enum(DETAIL_DIMENSIONS),
      slug: z.string().min(1),
      fromMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      toMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    }))
    .handler(async ({ input }) => {
      const target = await resolveDetailTarget(input.dimension, input.slug);
      if (!target.valid) {
        return {
          valid: false,
          dimension: input.dimension,
          slug: slugifyDetailLabel(input.slug),
          label: input.slug,
          months: [] as string[],
          statusSeries: [] as Array<{ month: string; status: string; count: number }>,
          totals: [] as Array<{ month: string; count: number; touched: number }>,
          updatedAt: null as string | null,
        };
      }

      const toMonth = input.toMonth ?? new Date().toISOString().slice(0, 7);
      const fromMonth = input.fromMonth ?? (() => {
        const end = new Date(`${toMonth}-01T00:00:00.000Z`);
        const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
        return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
      })();
      const fromDate = `${fromMonth}-01`;
      const [toYear, toMon] = toMonth.split('-').map(Number);
      const toExclusive = new Date(Date.UTC(toYear, toMon, 1)).toISOString().slice(0, 10);

      const params: unknown[] = [fromDate, toExclusive];
      let paramIdx = 3;
      const filters: string[] = ['e.eip_number NOT IN (2512, 3297, 1047)'];

      if (input.dimension === 'status') {
        filters.push(`COALESCE(NULLIF(s.status, ''), 'Unknown') = $${paramIdx}`);
        params.push(target.label);
        paramIdx += 1;
      } else if (input.dimension === 'category') {
        filters.push(`COALESCE(NULLIF(TRIM(s.category), ''), NULLIF(TRIM(s.type), ''), 'Unknown') = $${paramIdx}`);
        params.push(target.label);
        paramIdx += 1;
      } else if (input.dimension === 'repo' && target.repoKey) {
        filters.push(`LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = $${paramIdx}`);
        params.push(target.repoKey);
        paramIdx += 1;
      }

      const timelineRows = await prisma.$queryRawUnsafe<Array<{
        month: string;
        status: string | null;
        count: bigint;
        touched: bigint;
        total: bigint;
        latest_changed_at: Date | null;
      }>>(
        `
        WITH month_series AS (
          SELECT TO_CHAR(m, 'YYYY-MM') AS month
          FROM generate_series($1::date, ($2::date - INTERVAL '1 month')::date, INTERVAL '1 month') m
        ),
        monthly AS (
          SELECT
            TO_CHAR(date_trunc('month', se.changed_at), 'YYYY-MM') AS month,
            COALESCE(NULLIF(se.to_status, ''), 'Unknown') AS status,
            COUNT(*)::bigint AS count,
            COUNT(DISTINCT se.eip_id)::bigint AS touched,
            MAX(se.changed_at) AS latest_changed_at
          FROM eip_status_events se
          JOIN eips e ON e.id = se.eip_id
          LEFT JOIN eip_snapshots s ON s.eip_id = e.id
          LEFT JOIN repositories r ON r.id = se.repository_id
          WHERE se.changed_at >= $1::date
            AND se.changed_at < $2::date
            AND ${filters.join(' AND ')}
          GROUP BY 1, 2
        ),
        totals AS (
          SELECT month, SUM(count)::bigint AS total, SUM(touched)::bigint AS touched
          FROM monthly
          GROUP BY month
        )
        SELECT
          ms.month,
          m.status,
          COALESCE(m.count, 0::bigint) AS count,
          COALESCE(m.touched, 0::bigint) AS touched,
          COALESCE(t.total, 0::bigint) AS total,
          m.latest_changed_at
        FROM month_series ms
        LEFT JOIN monthly m ON m.month = ms.month
        LEFT JOIN totals t ON t.month = ms.month
        ORDER BY ms.month ASC, m.status ASC
        `,
        ...params
      );

      const updatedAt = timelineRows.reduce<Date | null>((latest, row) => {
        if (!row.latest_changed_at) return latest;
        if (!latest || row.latest_changed_at > latest) return row.latest_changed_at;
        return latest;
      }, null);

      const months = Array.from(new Set(timelineRows.map((row) => row.month)));
      const totalsMap = new Map<string, { count: number; touched: number }>();
      for (const row of timelineRows) {
        if (!totalsMap.has(row.month)) {
          totalsMap.set(row.month, {
            count: Number(row.total ?? 0),
            touched: Number(row.touched ?? 0),
          });
        }
      }

      return {
        valid: true,
        dimension: input.dimension,
        slug: slugifyDetailLabel(input.slug),
        label: target.label,
        months,
        statusSeries: timelineRows
          .filter((row) => Boolean(row.status))
          .map((row) => ({
            month: row.month,
            status: row.status || 'Unknown',
            count: Number(row.count ?? 0),
          })),
        totals: months.map((month) => ({
          month,
          count: totalsMap.get(month)?.count ?? 0,
          touched: totalsMap.get(month)?.touched ?? 0,
        })),
        updatedAt: updatedAt?.toISOString() ?? null,
      };
    }),

  getDetailRepoGithubStats: optionalAuthProcedure
    .input(z.object({
      slug: z.string().min(1),
    }))
    .handler(async ({ input }) => {
      const target = await resolveDetailTarget('repo', input.slug);
      if (!target.valid || !target.repoKey) {
        return {
          valid: false,
          repo: input.slug,
          githubRepo: null as string | null,
          stars: null as number | null,
          forks: null as number | null,
          watchlist: null as number | null,
          openIssues: 0,
          openPRs: 0,
          totalOpen: 0,
          updatedAt: null as string | null,
        };
      }

      const [openRows] = await Promise.all([
        prisma.$queryRaw<Array<{ open_issues: bigint; open_prs: bigint }>>`
          SELECT
            (
              SELECT COUNT(*)::bigint
              FROM issues i
              JOIN repositories r ON r.id = i.repository_id
              WHERE LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${target.repoKey}
                AND LOWER(COALESCE(i.state, '')) = 'open'
            ) AS open_issues,
            (
              SELECT COUNT(*)::bigint
              FROM pull_requests p
              JOIN repositories r ON r.id = p.repository_id
              WHERE LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${target.repoKey}
                AND LOWER(COALESCE(p.state, '')) = 'open'
            ) AS open_prs
        `,
      ]);

      const openRow = openRows[0];
      const openIssues = Number(openRow?.open_issues ?? 0);
      const openPRs = Number(openRow?.open_prs ?? 0);

      const githubRepo = repoKeyToGithubRepo(target.repoKey);
      let stars: number | null = null;
      let forks: number | null = null;
      let watchlist: number | null = null;

      try {
        const ghRes = await fetch(`https://api.github.com/repos/${githubRepo}`, {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'eipsinsight-v4',
          },
          cache: 'no-store',
        });
        if (ghRes.ok) {
          const gh = await ghRes.json();
          stars = typeof gh.stargazers_count === 'number' ? gh.stargazers_count : null;
          forks = typeof gh.forks_count === 'number' ? gh.forks_count : null;
          watchlist = typeof gh.subscribers_count === 'number'
            ? gh.subscribers_count
            : (typeof gh.watchers_count === 'number' ? gh.watchers_count : null);
        }
      } catch {
        // Graceful fallback: DB-powered open issue/PR counts still returned.
      }

      return {
        valid: true,
        repo: target.label,
        githubRepo,
        stars,
        forks,
        watchlist,
        openIssues,
        openPRs,
        totalOpen: openIssues + openPRs,
        updatedAt: new Date().toISOString(),
      };
    }),

  getDetailProposals: optionalAuthProcedure
    .input(z.object({
      dimension: z.enum(DETAIL_DIMENSIONS),
      slug: z.string().min(1),
      q: z.string().optional(),
      status: z.string().optional(),
      category: z.string().optional(),
      sort: z.enum(['updated_desc', 'updated_asc', 'days_desc', 'days_asc', 'number_asc']).default('updated_desc'),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
    }))
    .handler(async ({ input }) => {
      const target = await resolveDetailTarget(input.dimension, input.slug);
      if (!target.valid) {
        return {
          valid: false,
          dimension: input.dimension,
          slug: slugifyDetailLabel(input.slug),
          label: input.slug,
          total: 0,
          totalPages: 1,
          page: input.page,
          pageSize: input.pageSize,
          rows: [] as Array<{
            id: number;
            number: number;
            title: string;
            author: string | null;
            status: string;
            category: string | null;
            type: string | null;
            repo: string;
            kind: 'EIP' | 'ERC' | 'RIP';
            updatedAt: string | null;
            daysInStatus: number | null;
          }>,
        };
      }

      const baseParams: unknown[] = [];
      let baseIdx = 1;
      const eipBaseFilters: string[] = ['e.eip_number NOT IN (2512, 3297, 1047)'];

      if (input.dimension === 'status') {
        eipBaseFilters.push(`COALESCE(NULLIF(s.status, ''), 'Unknown') = $${baseIdx}`);
        baseParams.push(target.label);
        baseIdx += 1;
      } else if (input.dimension === 'category') {
        eipBaseFilters.push(`COALESCE(NULLIF(TRIM(s.category), ''), NULLIF(TRIM(s.type), ''), 'Unknown') = $${baseIdx}`);
        baseParams.push(target.label);
        baseIdx += 1;
      } else if (input.dimension === 'repo' && target.repoKey) {
        eipBaseFilters.push(`LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = $${baseIdx}`);
        baseParams.push(target.repoKey);
        baseIdx += 1;
      }

      const includeRipRows =
        (input.dimension === 'status') ||
        (input.dimension === 'category' && ['rip', 'rips'].includes(target.label.toLowerCase())) ||
        (input.dimension === 'repo' && target.repoKey === 'rips');

      const ripBaseFilters: string[] = ['rip.rip_number <> 0'];
      if (input.dimension === 'status') {
        ripBaseFilters.push(`COALESCE(rip.status, 'Unknown') = $${baseIdx}`);
        baseParams.push(target.label);
        baseIdx += 1;
      }

      const whereParts: string[] = [];
      const whereParams: unknown[] = [];
      let whereIdx = baseIdx;

      if (input.q?.trim()) {
        whereParts.push(`(CAST(base.number AS TEXT) ILIKE $${whereIdx} OR COALESCE(base.title, '') ILIKE $${whereIdx} OR COALESCE(base.author, '') ILIKE $${whereIdx})`);
        whereParams.push(`%${input.q.trim()}%`);
        whereIdx += 1;
      }
      if (input.status?.trim()) {
        whereParts.push(`COALESCE(base.status, '') = $${whereIdx}`);
        whereParams.push(input.status.trim());
        whereIdx += 1;
      }
      if (input.category?.trim()) {
        whereParts.push(`COALESCE(base.category, '') = $${whereIdx}`);
        whereParams.push(input.category.trim());
        whereIdx += 1;
      }

      const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
      const orderByClause = (() => {
        switch (input.sort) {
          case 'updated_asc':
            return 'base.updated_at ASC NULLS LAST';
          case 'days_desc':
            return 'base.last_changed_at ASC NULLS LAST';
          case 'days_asc':
            return 'base.last_changed_at DESC NULLS LAST';
          case 'number_asc':
            return 'base.number ASC';
          case 'updated_desc':
          default:
            return 'base.updated_at DESC NULLS LAST';
        }
      })();

      const limit = input.pageSize;
      const offset = (input.page - 1) * input.pageSize;
      const allParams = [...baseParams, ...whereParams];

      const rows = await prisma.$queryRawUnsafe<Array<{
        id: number;
        number: number;
        title: string | null;
        author: string | null;
        status: string;
        category: string | null;
        type: string | null;
        repo: string;
        kind: string;
        updated_at: Date | null;
        last_changed_at: Date | null;
      }>>(
        `
        WITH base AS (
          SELECT
            s.eip_id AS id,
            e.eip_number AS number,
            e.title,
            e.author,
            COALESCE(NULLIF(s.status, ''), 'Unknown') AS status,
            COALESCE(NULLIF(TRIM(s.category), ''), NULLIF(TRIM(s.type), ''), 'Unknown') AS category,
            s.type AS type,
            LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) AS repo,
            CASE
              WHEN LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = 'rips' THEN 'RIP'
              WHEN LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = 'ercs' OR COALESCE(NULLIF(TRIM(s.category), ''), NULLIF(TRIM(s.type), ''), 'Unknown') = 'ERC' THEN 'ERC'
              ELSE 'EIP'
            END AS kind,
            s.updated_at AS updated_at,
            (SELECT MAX(changed_at) FROM eip_status_events ese WHERE ese.eip_id = s.eip_id) AS last_changed_at
          FROM eip_snapshots s
          JOIN eips e ON e.id = s.eip_id
          LEFT JOIN repositories r ON r.id = s.repository_id
          WHERE ${eipBaseFilters.join(' AND ')}
          ${includeRipRows ? `
          UNION ALL
          SELECT
            (100000000 + rip.id)::int AS id,
            rip.rip_number AS number,
            rip.title,
            NULL::text AS author,
            COALESCE(rip.status, 'Unknown') AS status,
            'RIP'::text AS category,
            NULL::text AS type,
            'rips'::text AS repo,
            'RIP'::text AS kind,
            COALESCE((SELECT MAX(rc.commit_date) FROM rip_commits rc WHERE rc.rip_id = rip.id), rip.created_at) AS updated_at,
            COALESCE((SELECT MAX(rc.commit_date) FROM rip_commits rc WHERE rc.rip_id = rip.id), rip.created_at) AS last_changed_at
          FROM rips rip
          WHERE ${ripBaseFilters.join(' AND ')}
          ` : ''}
        )
        SELECT *
        FROM base
        ${whereClause}
        ORDER BY ${orderByClause}, base.number ASC
        LIMIT ${limit} OFFSET ${offset}
        `,
        ...allParams
      );

      const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `
        WITH base AS (
          SELECT
            s.eip_id AS id,
            e.eip_number AS number,
            e.title,
            e.author,
            COALESCE(NULLIF(s.status, ''), 'Unknown') AS status,
            COALESCE(NULLIF(TRIM(s.category), ''), NULLIF(TRIM(s.type), ''), 'Unknown') AS category,
            s.type AS type,
            LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) AS repo,
            CASE
              WHEN LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = 'rips' THEN 'RIP'
              WHEN LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = 'ercs' OR COALESCE(NULLIF(TRIM(s.category), ''), NULLIF(TRIM(s.type), ''), 'Unknown') = 'ERC' THEN 'ERC'
              ELSE 'EIP'
            END AS kind,
            s.updated_at AS updated_at,
            (SELECT MAX(changed_at) FROM eip_status_events ese WHERE ese.eip_id = s.eip_id) AS last_changed_at
          FROM eip_snapshots s
          JOIN eips e ON e.id = s.eip_id
          LEFT JOIN repositories r ON r.id = s.repository_id
          WHERE ${eipBaseFilters.join(' AND ')}
          ${includeRipRows ? `
          UNION ALL
          SELECT
            (100000000 + rip.id)::int AS id,
            rip.rip_number AS number,
            rip.title,
            NULL::text AS author,
            COALESCE(rip.status, 'Unknown') AS status,
            'RIP'::text AS category,
            NULL::text AS type,
            'rips'::text AS repo,
            'RIP'::text AS kind,
            COALESCE((SELECT MAX(rc.commit_date) FROM rip_commits rc WHERE rc.rip_id = rip.id), rip.created_at) AS updated_at,
            COALESCE((SELECT MAX(rc.commit_date) FROM rip_commits rc WHERE rc.rip_id = rip.id), rip.created_at) AS last_changed_at
          FROM rips rip
          WHERE ${ripBaseFilters.join(' AND ')}
          ` : ''}
        )
        SELECT COUNT(*)::bigint AS count
        FROM base
        ${whereClause}
        `,
        ...allParams
      );

      const total = Number(countRows[0]?.count ?? 0);
      const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

      return {
        valid: true,
        dimension: input.dimension,
        slug: slugifyDetailLabel(input.slug),
        label: target.label,
        total,
        totalPages,
        page: input.page,
        pageSize: input.pageSize,
        rows: rows.map((row) => ({
          id: row.id,
          number: row.number,
          title: row.title || `${row.kind}-${row.number}`,
          author: row.author || null,
          status: row.status,
          category: row.category,
          type: row.type,
          repo: row.repo || 'unknown',
          kind: row.kind === 'RIP' ? 'RIP' : row.kind === 'ERC' ? 'ERC' : 'EIP',
          updatedAt: row.updated_at?.toISOString() ?? null,
          daysInStatus: row.last_changed_at
            ? Math.floor((Date.now() - new Date(row.last_changed_at).getTime()) / (1000 * 60 * 60 * 24))
            : null,
        })),
      };
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
        actor: string;
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
        SELECT actor, 1::bigint AS unique_actors, COUNT(*) AS total_actions
        FROM filtered
        GROUP BY actor
      `;

      const aggregate = new Map<string, { role: string; uniqueActors: number; totalActions: number }>();
      for (const role of ['EDITOR', 'REVIEWER', 'CONTRIBUTOR'] as const) {
        aggregate.set(role, { role, uniqueActors: 0, totalActions: 0 });
      }
      for (const row of rows) {
        const role = resolveCanonicalRole(row.actor);
        const entry = aggregate.get(role)!;
        entry.uniqueActors += 1;
        entry.totalActions += Number(row.total_actions);
      }
      return Array.from(aggregate.values());
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
          COUNT(*) AS total_actions,
          COUNT(DISTINCT f.pr_number) AS prs_touched,
          COUNT(DISTINCT CASE WHEN LOWER(COALESCE(f.action_type, '')) = 'opened' THEN f.pr_number END) AS prs_created,
          COUNT(DISTINCT CASE WHEN LOWER(COALESCE(f.action_type, '')) = 'merged' THEN f.pr_number END) AS prs_merged,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(f.action_type, '')) IN ('commented', 'issue_comment')) AS comments,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(f.action_type, '')) = 'reviewed') AS reviews,
          MAX(f.occurred_at) AS last_activity
        FROM filtered f
        GROUP BY f.actor
        ORDER BY total_actions DESC, last_activity DESC NULLS LAST
        LIMIT ${Math.min(input.limit * 5, 500)}
      `;

      return rows
        .map((entry) => {
          const canonicalRole = resolveCanonicalRole(entry.actor);
          return {
            actor: entry.actor,
            totalActions: Number(entry.total_actions),
            totalScore:
              Number(entry.prs_touched) +
              Number(entry.reviews) * 2 +
              Number(entry.prs_merged) * 3 +
              Number(entry.prs_created),
            prsReviewed: Number(entry.reviews),
            comments: Number(entry.comments),
            prsCreated: Number(entry.prs_created),
            prsMerged: Number(entry.prs_merged),
            avgResponseHours: null,
            lastActivity: entry.last_activity?.toISOString() || null,
            role: canonicalRole,
            prsTouched: Number(entry.prs_touched),
          };
        })
        .filter((entry) => !input.role || entry.role === input.role)
        .slice(0, input.limit)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
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
        LIMIT ${Math.min(input.limit * 5, 500)}
      `;

      let normalized = events.map(e => ({
        id: e.id.toString(),
        actor: e.actor,
        role: resolveCanonicalRole(e.actor),
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
            AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
            AND (${input.actor ?? null}::text IS NULL OR LOWER(ca.actor) = LOWER(${input.actor ?? null}))
            AND ca.actor NOT LIKE '%[bot]%'
            AND ca.actor NOT LIKE '%-bot'
            AND LOWER(ca.actor) NOT LIKE '%bot'
            AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
          ORDER BY ca.occurred_at DESC
          LIMIT ${Math.min(input.limit * 5, 500)}
        `;
        normalized = fallback.map(e => ({
          id: e.id.toString(),
          actor: e.actor,
          role: resolveCanonicalRole(e.actor),
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
            AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
            AND (${input.actor ?? null}::text IS NULL OR LOWER(pe.actor) = LOWER(${input.actor ?? null}))
            AND pe.actor NOT LIKE '%[bot]%'
            AND pe.actor NOT LIKE '%-bot'
            AND LOWER(pe.actor) NOT LIKE '%bot'
            AND pe.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
          ORDER BY pe.created_at DESC
          LIMIT ${Math.min(input.limit * 5, 500)}
        `;

        normalized = fallbackEvents.map((e) => ({
          id: e.id.toString(),
          actor: e.actor,
          role: resolveCanonicalRole(e.actor),
          eventType: String(e.event_type || '').toUpperCase(),
          prNumber: e.pr_number,
          createdAt: e.created_at.toISOString(),
          githubId: e.github_id,
          repoName: e.repo_name || 'ethereum/EIPs',
        }));
      }

      return normalized
        .filter((event) => !input.role || event.role === input.role)
        .slice(0, input.limit);
    }),

  getRoleContributionMix: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(ROLE_FILTER_REPOS).default('all'),
      category: z.enum(ROLE_FILTER_CATEGORIES).default('all'),
      timeRange: z.enum(ROLE_FILTER_TIME_RANGES).default('90d'),
      actor: z.string().trim().min(1).optional(),
    }))
    .handler(async ({ input }) => {
      const from = getFromForTimeRange(input.timeRange);
      const repoFilter = input.repo === 'all' ? null : input.repo;
      const categoryFilter = input.category === 'all' ? null : input.category;

      const rows = await prisma.$queryRaw<Array<{
        actor: string;
        action_type: string | null;
        count: bigint;
      }>>`
        SELECT
          ca.actor,
          LOWER(COALESCE(ca.action_type, 'activity')) AS action_type,
          COUNT(*)::bigint AS count
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE (${from}::timestamp IS NULL OR ca.occurred_at >= ${from})
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
        GROUP BY ca.actor, LOWER(COALESCE(ca.action_type, 'activity'))
      `;

      const metrics = [
        { metric: 'Reviews', EDITOR: 0, REVIEWER: 0, CONTRIBUTOR: 0, total: 0 },
        { metric: 'Comments', EDITOR: 0, REVIEWER: 0, CONTRIBUTOR: 0, total: 0 },
        { metric: 'PR Created', EDITOR: 0, REVIEWER: 0, CONTRIBUTOR: 0, total: 0 },
        { metric: 'PR Merged', EDITOR: 0, REVIEWER: 0, CONTRIBUTOR: 0, total: 0 },
      ];

      for (const row of rows) {
        const role = resolveCanonicalRole(row.actor);
        const c = Number(row.count);
        const action = row.action_type ?? 'activity';
        if (action === 'reviewed') metrics[0][role] += c;
        if (action === 'commented' || action === 'issue_comment') metrics[1][role] += c;
        if (action === 'opened') metrics[2][role] += c;
        if (action === 'merged') metrics[3][role] += c;
      }

      for (const m of metrics) {
        m.total = m.EDITOR + m.REVIEWER + m.CONTRIBUTOR;
      }

      return metrics;
    }),

  getRoleActorBreakdown: optionalAuthProcedure
    .input(z.object({
      actor: z.string().trim().min(1),
      repo: z.enum(ROLE_FILTER_REPOS).default('all'),
      category: z.enum(ROLE_FILTER_CATEGORIES).default('all'),
      timeRange: z.enum(ROLE_FILTER_TIME_RANGES).default('90d'),
      limit: z.number().min(1).max(500).default(200),
    }))
    .handler(async ({ input }) => {
      const from = getFromForTimeRange(input.timeRange);
      const repoFilter = input.repo === 'all' ? null : input.repo;
      const categoryFilter = input.category === 'all' ? null : input.category;

      const rows = await prisma.$queryRaw<Array<{
        id: bigint;
        actor: string;
        role: string | null;
        action_type: string | null;
        pr_number: number;
        occurred_at: Date;
        repo_name: string | null;
      }>>`
        SELECT
          ca.id,
          ca.actor,
          ca.role,
          ca.action_type,
          ca.pr_number,
          ca.occurred_at,
          r.name AS repo_name
        FROM contributor_activity ca
        LEFT JOIN repositories r ON r.id = ca.repository_id
        WHERE LOWER(ca.actor) = LOWER(${input.actor})
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
          AND ca.actor NOT IN ('dependabot', 'github-actions', 'codecov', 'renovate', 'eth-bot', 'ethereum-bot')
        ORDER BY ca.occurred_at DESC
        LIMIT ${input.limit}
      `;

      return rows.map((row) => ({
        id: row.id.toString(),
        actor: row.actor,
        role: resolveCanonicalRole(row.actor),
        actionType: String(row.action_type || 'activity').toUpperCase(),
        prNumber: row.pr_number,
        occurredAt: row.occurred_at.toISOString(),
        repoName: row.repo_name || 'ethereum/EIPs',
      }));
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
      limit: z.number().min(1).max(100).default(30),
      windowDays: z.number().min(1).max(365).default(7),
      repo: z.enum(['all', 'eips', 'ercs', 'rips']).default('all'),
      status: z.string().trim().optional(),
      sort: z.enum(['score_desc', 'recent_desc', 'delta_desc']).default('score_desc'),
      q: z.string().trim().optional(),
    }))
    .handler(async ({ input }) => {
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - input.windowDays);
      const prevWindowStart = new Date(windowStart);
      prevWindowStart.setDate(prevWindowStart.getDate() - input.windowDays);
      const repoFilter = input.repo === 'all' ? null : input.repo;
      const statusFilter = input.status?.trim() ? input.status.trim() : null;
      const searchLike = input.q?.trim() ? `%${input.q.trim().toLowerCase()}%` : null;

      const sortClause =
        input.sort === 'recent_desc'
          ? 'last_activity DESC NULLS LAST'
          : input.sort === 'delta_desc'
            ? 'score_delta DESC, score DESC'
            : 'score DESC, last_activity DESC NULLS LAST';

      let trendingData = await prisma.$queryRawUnsafe<Array<{
        eip_id: number;
        eip_number: number;
        title: string | null;
        status: string;
        pr_events_count: bigint;
        review_events_count: bigint;
        comment_events_count: bigint;
        commit_events_count: bigint;
        status_changes_count: bigint;
        prev_pr_events_count: bigint;
        prev_status_changes_count: bigint;
        last_activity: Date | null;
        repo_name: string | null;
        category: string | null;
        score: number;
        score_delta: number;
      }>>(
        `
        WITH current_pr_events AS (
          SELECT 
            e.id AS eip_id,
            COUNT(*)::bigint AS pr_events_count,
            COUNT(*) FILTER (WHERE UPPER(COALESCE(pe.event_type, '')) IN ('APPROVED','CHANGES_REQUESTED','REVIEWED'))::bigint AS review_events_count,
            COUNT(*) FILTER (WHERE UPPER(COALESCE(pe.event_type, '')) = 'COMMENTED')::bigint AS comment_events_count,
            COUNT(*) FILTER (WHERE UPPER(COALESCE(pe.event_type, '')) = 'COMMITTED')::bigint AS commit_events_count,
            MAX(pe.created_at) AS last_pr_activity
          FROM pull_request_eips pre
          JOIN eips e ON e.eip_number = pre.eip_number
          JOIN pr_events pe ON pe.pr_number = pre.pr_number AND pe.repository_id = pre.repository_id
          LEFT JOIN repositories r ON r.id = pe.repository_id
          WHERE pe.created_at >= $1
            AND ($2::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = $2)
          GROUP BY e.id
        ),
        previous_pr_events AS (
          SELECT 
            e.id AS eip_id,
            COUNT(*)::bigint AS prev_pr_events_count
          FROM pull_request_eips pre
          JOIN eips e ON e.eip_number = pre.eip_number
          JOIN pr_events pe ON pe.pr_number = pre.pr_number AND pe.repository_id = pre.repository_id
          LEFT JOIN repositories r ON r.id = pe.repository_id
          WHERE pe.created_at >= $3
            AND pe.created_at < $1
            AND ($2::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = $2)
          GROUP BY e.id
        ),
        current_status_changes AS (
          SELECT eip_id, COUNT(*)::bigint AS status_changes_count, MAX(changed_at) AS last_status_activity
          FROM eip_status_events
          WHERE changed_at >= $1 AND eip_id IS NOT NULL
          GROUP BY eip_id
        ),
        previous_status_changes AS (
          SELECT eip_id, COUNT(*)::bigint AS prev_status_changes_count
          FROM eip_status_events
          WHERE changed_at >= $3 AND changed_at < $1 AND eip_id IS NOT NULL
          GROUP BY eip_id
        )
        SELECT
          e.id AS eip_id,
          e.eip_number,
          e.title,
          COALESCE(es.status, 'Unknown') AS status,
          COALESCE(cpe.pr_events_count, 0) AS pr_events_count,
          COALESCE(cpe.review_events_count, 0) AS review_events_count,
          COALESCE(cpe.comment_events_count, 0) AS comment_events_count,
          COALESCE(cpe.commit_events_count, 0) AS commit_events_count,
          COALESCE(csc.status_changes_count, 0) AS status_changes_count,
          COALESCE(ppe.prev_pr_events_count, 0) AS prev_pr_events_count,
          COALESCE(psc.prev_status_changes_count, 0) AS prev_status_changes_count,
          GREATEST(
            COALESCE(cpe.last_pr_activity, '1970-01-01'::timestamp),
            COALESCE(csc.last_status_activity, '1970-01-01'::timestamp),
            COALESCE(es.updated_at, '1970-01-01'::timestamp),
            COALESCE(e.created_at, '1970-01-01'::timestamp)
          ) AS last_activity,
          repo.name AS repo_name,
          es.category,
          (
            (COALESCE(cpe.pr_events_count, 0) * 2) +
            (COALESCE(cpe.comment_events_count, 0) * 1) +
            (COALESCE(cpe.review_events_count, 0) * 2) +
            (COALESCE(cpe.commit_events_count, 0) * 1) +
            (COALESCE(csc.status_changes_count, 0) * 3)
          )::int AS score,
          (
            (
              (COALESCE(cpe.pr_events_count, 0) * 2) +
              (COALESCE(cpe.comment_events_count, 0) * 1) +
              (COALESCE(cpe.review_events_count, 0) * 2) +
              (COALESCE(cpe.commit_events_count, 0) * 1) +
              (COALESCE(csc.status_changes_count, 0) * 3)
            ) -
            (
              (COALESCE(ppe.prev_pr_events_count, 0) * 2) +
              (COALESCE(psc.prev_status_changes_count, 0) * 3)
            )
          )::int AS score_delta
        FROM eips e
        LEFT JOIN eip_snapshots es ON es.eip_id = e.id
        LEFT JOIN repositories repo ON repo.id = es.repository_id
        LEFT JOIN current_pr_events cpe ON cpe.eip_id = e.id
        LEFT JOIN previous_pr_events ppe ON ppe.eip_id = e.id
        LEFT JOIN current_status_changes csc ON csc.eip_id = e.id
        LEFT JOIN previous_status_changes psc ON psc.eip_id = e.id
        WHERE e.eip_number NOT IN (2512, 3297, 1047)
          AND (
            COALESCE(cpe.pr_events_count, 0) > 0
            OR COALESCE(csc.status_changes_count, 0) > 0
          )
          AND ($4::text IS NULL OR COALESCE(es.status, 'Unknown') = $4)
          AND ($2::text IS NULL OR LOWER(SPLIT_PART(COALESCE(repo.name, ''), '/', 2)) = $2)
          AND (
            $5::text IS NULL
            OR LOWER(COALESCE(e.title, '')) LIKE $5
            OR LOWER(CONCAT('eip-', e.eip_number::text)) LIKE $5
          )
        ORDER BY ${sortClause}
        LIMIT $6
      `,
        windowStart, repoFilter, prevWindowStart, statusFilter, searchLike, input.limit
      );

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
            review_events_count: bigint;
            comment_events_count: bigint;
            commit_events_count: bigint;
            status_changes_count: bigint;
            prev_pr_events_count: bigint;
            prev_status_changes_count: bigint;
            last_activity: Date;
            repo_name: string | null;
            category: string | null;
            score: number;
            score_delta: number;
          }>>`
          SELECT 
            e.id as eip_id,
            e.eip_number,
            e.title,
            COALESCE(es.status, 'Unknown') as status,
            0::bigint as pr_events_count,
            0::bigint as review_events_count,
            0::bigint as comment_events_count,
            0::bigint as commit_events_count,
            0::bigint as status_changes_count,
            0::bigint as prev_pr_events_count,
            0::bigint as prev_status_changes_count,
            COALESCE(es.updated_at, e.created_at) as last_activity
            ,repo.name as repo_name
            ,es.category
            ,0::int as score
            ,0::int as score_delta
          FROM eips e
          LEFT JOIN eip_snapshots es ON e.id = es.eip_id
          LEFT JOIN repositories repo ON repo.id = es.repository_id
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
            review_events_count: bigint;
            comment_events_count: bigint;
            commit_events_count: bigint;
            status_changes_count: bigint;
            prev_pr_events_count: bigint;
            prev_status_changes_count: bigint;
            last_activity: Date;
            repo_name: string | null;
            category: string | null;
            score: number;
            score_delta: number;
          }>>`
          SELECT 
            e.id as eip_id,
            e.eip_number,
            e.title,
            COALESCE(es.status, 'Unknown') as status,
            0::bigint as pr_events_count,
            0::bigint as review_events_count,
            0::bigint as comment_events_count,
            0::bigint as commit_events_count,
            0::bigint as status_changes_count,
            0::bigint as prev_pr_events_count,
            0::bigint as prev_status_changes_count,
            COALESCE(es.updated_at, e.created_at) as last_activity
            ,repo.name as repo_name
            ,es.category
            ,0::int as score
            ,0::int as score_delta
          FROM eips e
          LEFT JOIN eip_snapshots es ON e.id = es.eip_id
          LEFT JOIN repositories repo ON repo.id = es.repository_id
          ORDER BY e.eip_number DESC
          LIMIT ${input.limit}
        `;
      }

      const ids = trendingData.map((t) => t.eip_id);
      const linkedPrRows = ids.length
        ? await prisma.$queryRaw<Array<{
            eip_id: number;
            pr_number: number;
            pr_title: string | null;
            pr_state: string | null;
            events_count: bigint;
          }>>`
            SELECT
              e.id AS eip_id,
              pre.pr_number,
              pr.title AS pr_title,
              pr.state AS pr_state,
              COUNT(pe.id)::bigint AS events_count
            FROM pull_request_eips pre
            JOIN eips e ON e.eip_number = pre.eip_number
            LEFT JOIN pull_requests pr ON pr.pr_number = pre.pr_number AND pr.repository_id = pre.repository_id
            LEFT JOIN pr_events pe ON pe.pr_number = pre.pr_number AND pe.repository_id = pre.repository_id AND pe.created_at >= ${windowStart}
            WHERE e.id = ANY(${ids})
            GROUP BY e.id, pre.pr_number, pr.title, pr.state
            ORDER BY e.id, events_count DESC
          `
        : [];

      const linkedMap = new Map<number, Array<{ prNumber: number; title: string; state: string }>>();
      for (const row of linkedPrRows) {
        if (!linkedMap.has(row.eip_id)) linkedMap.set(row.eip_id, []);
        const arr = linkedMap.get(row.eip_id)!;
        if (arr.length < 3) {
          arr.push({
            prNumber: row.pr_number,
            title: row.pr_title || `PR #${row.pr_number}`,
            state: row.pr_state || 'open',
          });
        }
      }

      return trendingData.map((t) => {
        const topEvents = [
          { type: 'reviews', count: Number(t.review_events_count) },
          { type: 'comments', count: Number(t.comment_events_count) },
          { type: 'commits', count: Number(t.commit_events_count) },
          { type: 'status', count: Number(t.status_changes_count) },
        ].filter((event) => event.count > 0);

        const reasons: string[] = [];
        if (Number(t.review_events_count) > 0) reasons.push(`${t.review_events_count} reviews`);
        if (Number(t.comment_events_count) > 0) reasons.push(`${t.comment_events_count} comments`);
        if (Number(t.commit_events_count) > 0) reasons.push(`${t.commit_events_count} commits`);
        if (Number(t.status_changes_count) > 0) reasons.push(`${t.status_changes_count} status changes`);

        const shortRepo = (t.repo_name || '').split('/')[1]?.toLowerCase() || '';
        const kind = shortRepo === 'ercs' || (t.category || '').toUpperCase() === 'ERC'
          ? 'ERC'
          : shortRepo === 'rips'
            ? 'RIP'
            : 'EIP';

        return {
          eipId: t.eip_id,
          number: t.eip_number,
          title: t.title || `EIP-${t.eip_number}`,
          status: t.status,
          score: Number(t.score),
          scoreDelta: Number(t.score_delta),
          trendingReason: reasons.join(', ') || 'Recent activity',
          lastActivity: t.last_activity?.toISOString() || null,
          repo: shortRepo || 'eips',
          kind,
          topEvents,
          topLinkedPRs: linkedMap.get(t.eip_id) ?? [],
        };
      });
    }),

  // Get trending heatmap data (last 30 days)
  getTrendingHeatmap: optionalAuthProcedure
    .input(z.object({
      topN: z.number().min(5).max(20).default(10),
      windowDays: z.number().min(7).max(365).default(30),
      repo: z.enum(['all', 'eips', 'ercs', 'rips']).default('all'),
    }))
    .handler(async ({ input }) => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - input.windowDays);
      const repoFilter = input.repo === 'all' ? null : input.repo;

      // Get top N most active EIPs in last 30 days
      const topEIPs = await prisma.$queryRaw<Array<{
        eip_id: number;
        eip_number: number;
        title: string | null;
        repo_name: string | null;
        total_activity: bigint;
      }>>`
        WITH activity_counts AS (
          SELECT 
            e.id as eip_id,
            COUNT(pe.id) + COUNT(ese.id) as activity
          FROM eips e
          LEFT JOIN pull_request_eips pre ON pre.eip_number = e.eip_number
          LEFT JOIN pr_events pe ON pe.pr_number = pre.pr_number AND pe.repository_id = pre.repository_id AND pe.created_at >= ${fromDate}
          LEFT JOIN eip_status_events ese ON ese.eip_id = e.id AND ese.changed_at >= ${fromDate}
          LEFT JOIN eip_snapshots es ON es.eip_id = e.id
          LEFT JOIN repositories r ON r.id = es.repository_id
          WHERE e.eip_number NOT IN (2512, 3297, 1047)
            AND (${repoFilter}::text IS NULL OR LOWER(SPLIT_PART(COALESCE(r.name, ''), '/', 2)) = ${repoFilter})
          GROUP BY e.id
        )
        SELECT 
          e.id as eip_id,
          e.eip_number,
          e.title,
          r.name as repo_name,
          COALESCE(ac.activity, 0) as total_activity
        FROM eips e
        LEFT JOIN eip_snapshots es ON es.eip_id = e.id
        LEFT JOIN repositories r ON r.id = es.repository_id
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
        WITH status_daily AS (
          SELECT eip_id, DATE(changed_at) as day, COUNT(*)::bigint as c
          FROM eip_status_events
          WHERE eip_id = ANY(${eipIds}) AND changed_at >= ${fromDate}
          GROUP BY eip_id, DATE(changed_at)
        ),
        pr_daily AS (
          SELECT e.id as eip_id, DATE(pe.created_at) as day, COUNT(*)::bigint as c
          FROM pull_request_eips pre
          JOIN eips e ON e.eip_number = pre.eip_number
          JOIN pr_events pe ON pe.pr_number = pre.pr_number AND pe.repository_id = pre.repository_id
          WHERE e.id = ANY(${eipIds}) AND pe.created_at >= ${fromDate}
          GROUP BY e.id, DATE(pe.created_at)
        ),
        unioned AS (
          SELECT * FROM status_daily
          UNION ALL
          SELECT * FROM pr_daily
        )
        SELECT eip_id, day, SUM(c)::bigint AS activity
        FROM unioned
        GROUP BY eip_id, day
        ORDER BY day
      `;

      // Build heatmap data structure
      const heatmapData = topEIPs.map(eip => {
        const eipActivity = dailyActivity.filter(d => d.eip_id === eip.eip_id);
        const dailyData: { date: string; value: number }[] = [];
        
        for (let i = 0; i < input.windowDays; i++) {
          const date = new Date();
          date.setDate(date.getDate() - ((input.windowDays - 1) - i));
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
          repo: (eip.repo_name || '').split('/')[1]?.toLowerCase() || 'eips',
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
