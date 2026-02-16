import { os, checkAPIToken, type Ctx } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

const repoFilterSchema = z.object({
  repo: z.enum(['eips', 'ercs', 'rips']).optional(),
})

const tableInputSchema = z.object({
  repo: z.enum(['eips', 'ercs', 'rips']).optional(),
  status: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
  category: z.array(z.string()).optional(),
  yearFrom: z.number().optional(),
  yearTo: z.number().optional(),
  search: z.string().optional(),
  sortBy: z.enum([
    'number', 'title', 'status', 'type', 'category',
    'created_at', 'updated_at', 'days_in_status', 'linked_prs',
  ]).optional().default('number'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().optional().default(1),
  pageSize: z.number().optional().default(50),
})

export const standardsProcedures = {
  // ——— KPIs ———
  getKPIs: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        total: bigint;
        in_review: bigint;
        finalized: bigint;
        new_this_year: bigint;
      }>>(
        `
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE s.status IN ('Draft', 'Review', 'Last Call'))::bigint AS in_review,
          COUNT(*) FILTER (WHERE s.status = 'Final')::bigint AS finalized,
          COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM e.created_at) = EXTRACT(YEAR FROM CURRENT_DATE))::bigint AS new_this_year
        FROM eip_snapshots s
        JOIN eips e ON s.eip_id = e.id
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
      `,
        input.repo ?? null
      );

      const row = results[0];
      return {
        total: Number(row?.total ?? 0),
        inReview: Number(row?.in_review ?? 0),
        finalized: Number(row?.finalized ?? 0),
        newThisYear: Number(row?.new_this_year ?? 0),
      };
    }),

  // ——— RIP-specific KPIs ———
  getRIPKPIs: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        total: bigint;
        active: bigint;
        recent_commits: bigint;
        most_active_rip: number | null;
        most_active_title: string | null;
        most_active_commits: bigint;
      }>>(
        `
        WITH rip_stats AS (
          SELECT
            r.rip_number,
            r.title,
            COUNT(rc.id)::bigint AS commit_count
          FROM rips r
          LEFT JOIN rip_commits rc ON rc.rip_id = r.id
          GROUP BY r.rip_number, r.title
        ),
        recent AS (
          SELECT COUNT(*)::bigint AS cnt
          FROM rip_commits
          WHERE commit_date >= NOW() - INTERVAL '30 days'
        )
        SELECT
          (SELECT COUNT(*)::bigint FROM rips) AS total,
          (SELECT COUNT(*)::bigint FROM rips WHERE status NOT IN ('Withdrawn', 'Stagnant') OR status IS NULL) AS active,
          (SELECT cnt FROM recent) AS recent_commits,
          (SELECT rip_number FROM rip_stats ORDER BY commit_count DESC LIMIT 1) AS most_active_rip,
          (SELECT title FROM rip_stats ORDER BY commit_count DESC LIMIT 1) AS most_active_title,
          (SELECT commit_count FROM rip_stats ORDER BY commit_count DESC LIMIT 1) AS most_active_commits
      `
      );

      const row = results[0];
      return {
        total: Number(row?.total ?? 0),
        active: Number(row?.active ?? 0),
        recentCommits: Number(row?.recent_commits ?? 0),
        mostActiveRip: row?.most_active_rip ?? null,
        mostActiveTitle: row?.most_active_title ?? null,
        mostActiveCommits: Number(row?.most_active_commits ?? 0),
      };
    }),

  // ——— Status Distribution (stacked by repo) ———
  getStatusDistribution: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        status: string;
        repo_short: string;
        count: bigint;
      }>>(
        `
        SELECT
          s.status,
          LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short,
          COUNT(*)::bigint AS count
        FROM eip_snapshots s
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY s.status, LOWER(SPLIT_PART(r.name, '/', 2))
        ORDER BY count DESC
      `,
        input.repo ?? null
      );

      return results.map(r => ({
        status: r.status,
        repo: r.repo_short || 'unknown',
        count: Number(r.count),
      }));
    }),

  // ——— Trends Over Time (standards created per year, by repo) ———
  getCreationTrends: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        year: number;
        repo_short: string;
        count: bigint;
      }>>(
        `
        SELECT
          EXTRACT(YEAR FROM e.created_at)::int AS year,
          LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short,
          COUNT(*)::bigint AS count
        FROM eips e
        JOIN eip_snapshots s ON s.eip_id = e.id
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE e.created_at IS NOT NULL
          AND ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY EXTRACT(YEAR FROM e.created_at), LOWER(SPLIT_PART(r.name, '/', 2))
        ORDER BY year ASC
      `,
        input.repo ?? null
      );

      return results.map(r => ({
        year: r.year,
        repo: r.repo_short || 'unknown',
        count: Number(r.count),
      }));
    }),

  // ——— Category Breakdown ———
  getCategoryBreakdown: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        category: string;
        count: bigint;
      }>>(
        `
        SELECT
          CASE
            WHEN s.category IS NOT NULL AND TRIM(s.category) <> '' THEN s.category
            WHEN TRIM(COALESCE(s.type, '')) <> '' THEN s.type
            ELSE 'Other'
          END AS category,
          COUNT(*)::bigint AS count
        FROM eip_snapshots s
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
        GROUP BY
          CASE
            WHEN s.category IS NOT NULL AND TRIM(s.category) <> '' THEN s.category
            WHEN TRIM(COALESCE(s.type, '')) <> '' THEN s.type
            ELSE 'Other'
          END
        ORDER BY count DESC
      `,
        input.repo ?? null
      );

      return results.map(r => ({
        category: r.category,
        count: Number(r.count),
      }));
    }),

  // ——— Filter Options (for populating multi-selects) ———
  getFilterOptions: os
    .$context<Ctx>()
    .input(repoFilterSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const [statuses, types, categories] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ value: string }>>(
          `SELECT DISTINCT s.status AS value FROM eip_snapshots s
           LEFT JOIN repositories r ON s.repository_id = r.id
           WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
             AND s.status IS NOT NULL
           ORDER BY value`,
          input.repo ?? null
        ),
        prisma.$queryRawUnsafe<Array<{ value: string }>>(
          `SELECT DISTINCT s.type AS value FROM eip_snapshots s
           LEFT JOIN repositories r ON s.repository_id = r.id
           WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
             AND s.type IS NOT NULL
           ORDER BY value`,
          input.repo ?? null
        ),
        prisma.$queryRawUnsafe<Array<{ value: string }>>(
          `SELECT DISTINCT s.category AS value FROM eip_snapshots s
           LEFT JOIN repositories r ON s.repository_id = r.id
           WHERE ($1::text IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1))
             AND s.category IS NOT NULL
           ORDER BY value`,
          input.repo ?? null
        ),
      ]);

      return {
        statuses: statuses.map(s => s.value),
        types: types.map(t => t.value),
        categories: categories.map(c => c.value),
      };
    }),

  // ——— Main Table (EIPs/ERCs) ———
  getTable: os
    .$context<Ctx>()
    .input(tableInputSchema)
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const {
        repo, status, type, category, yearFrom, yearTo,
        search, sortBy, sortDir, page, pageSize,
      } = input;
      const offset = ((page ?? 1) - 1) * (pageSize ?? 50);

      // Build WHERE conditions
      const conditions: string[] = ['1=1'];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (repo) {
        conditions.push(`LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($${paramIdx})`);
        params.push(repo);
        paramIdx++;
      }

      if (status && status.length > 0) {
        conditions.push(`s.status = ANY($${paramIdx}::text[])`);
        params.push(status);
        paramIdx++;
      }

      if (type && type.length > 0) {
        conditions.push(`s.type = ANY($${paramIdx}::text[])`);
        params.push(type);
        paramIdx++;
      }

      if (category && category.length > 0) {
        conditions.push(`s.category = ANY($${paramIdx}::text[])`);
        params.push(category);
        paramIdx++;
      }

      if (yearFrom) {
        conditions.push(`EXTRACT(YEAR FROM e.created_at) >= $${paramIdx}`);
        params.push(yearFrom);
        paramIdx++;
      }

      if (yearTo) {
        conditions.push(`EXTRACT(YEAR FROM e.created_at) <= $${paramIdx}`);
        params.push(yearTo);
        paramIdx++;
      }

      if (search && search.trim()) {
        conditions.push(`(
          e.eip_number::text ILIKE '%' || $${paramIdx} || '%'
          OR e.title ILIKE '%' || $${paramIdx} || '%'
          OR e.author ILIKE '%' || $${paramIdx} || '%'
        )`);
        params.push(search.trim());
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');

      // Sort mapping
      const sortMap: Record<string, string> = {
        number: 'e.eip_number',
        title: 'e.title',
        status: 's.status',
        type: 's.type',
        category: 's.category',
        created_at: 'e.created_at',
        updated_at: 's.updated_at',
        days_in_status: 'days_in_status',
        linked_prs: 'linked_pr_count',
      };
      const orderCol = sortMap[sortBy ?? 'number'] ?? 'e.eip_number';
      const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';

      // Count query
      const countResult = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COUNT(*)::bigint AS total
         FROM eip_snapshots s
         JOIN eips e ON s.eip_id = e.id
         LEFT JOIN repositories r ON s.repository_id = r.id
         WHERE ${whereClause}`,
        ...params
      );

      const total = Number(countResult[0]?.total ?? 0);

      // Data query
      const limitParam = paramIdx;
      params.push(pageSize ?? 50);
      paramIdx++;
      const offsetParam = paramIdx;
      params.push(offset);

      const rows = await prisma.$queryRawUnsafe<Array<{
        repo_name: string;
        eip_number: number;
        title: string | null;
        author: string | null;
        status: string;
        type: string | null;
        category: string | null;
        created_at: string | null;
        updated_at: string;
        days_in_status: number;
        linked_pr_count: bigint;
      }>>(
        `SELECT
          COALESCE(r.name, 'unknown') AS repo_name,
          e.eip_number,
          e.title,
          e.author,
          s.status,
          s.type,
          s.category,
          TO_CHAR(e.created_at, 'YYYY-MM-DD') AS created_at,
          TO_CHAR(s.updated_at, 'YYYY-MM-DD') AS updated_at,
          COALESCE(
            EXTRACT(DAY FROM (NOW() - s.updated_at))::int,
            0
          ) AS days_in_status,
          (SELECT COUNT(*)::bigint FROM pull_request_eips pre WHERE pre.eip_number = e.eip_number AND pre.repository_id = COALESCE(s.repository_id, r.id)) AS linked_pr_count
        FROM eip_snapshots s
        JOIN eips e ON s.eip_id = e.id
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ${whereClause}
        ORDER BY ${orderCol} ${orderDir} NULLS LAST
        LIMIT $${limitParam} OFFSET $${offsetParam}`,
        ...params
      );

      return {
        total,
        page: page ?? 1,
        pageSize: pageSize ?? 50,
        totalPages: Math.ceil(total / (pageSize ?? 50)),
        rows: rows.map(r => ({
          repo: r.repo_name,
          number: r.eip_number,
          title: r.title,
          author: r.author,
          status: r.status,
          type: r.type,
          category: r.category,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          daysInStatus: r.days_in_status,
          linkedPRs: Number(r.linked_pr_count),
        })),
      };
    }),

  // ——— RIPs Table ———
  getRIPsTable: os
    .$context<Ctx>()
    .input(z.object({
      search: z.string().optional(),
      sortBy: z.enum(['number', 'title', 'status', 'author', 'created_at', 'last_commit', 'commits']).optional().default('number'),
      sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const { search, sortBy, sortDir, page, pageSize } = input;
      const offset = ((page ?? 1) - 1) * (pageSize ?? 50);

      const conditions: string[] = ['1=1'];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (search && search.trim()) {
        conditions.push(`(
          r.rip_number::text ILIKE '%' || $${paramIdx} || '%'
          OR r.title ILIKE '%' || $${paramIdx} || '%'
          OR r.author ILIKE '%' || $${paramIdx} || '%'
        )`);
        params.push(search.trim());
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');

      const sortMap: Record<string, string> = {
        number: 'r.rip_number',
        title: 'r.title',
        status: 'r.status',
        author: 'r.author',
        created_at: 'r.created_at',
        last_commit: 'last_commit',
        commits: 'commit_count',
      };
      const orderCol = sortMap[sortBy ?? 'number'] ?? 'r.rip_number';
      const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';

      const countResult = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COUNT(*)::bigint AS total FROM rips r WHERE ${whereClause}`,
        ...params
      );
      const total = Number(countResult[0]?.total ?? 0);

      const limitParam = paramIdx;
      params.push(pageSize ?? 50);
      paramIdx++;
      const offsetParam = paramIdx;
      params.push(offset);

      const rows = await prisma.$queryRawUnsafe<Array<{
        rip_number: number;
        title: string | null;
        status: string | null;
        author: string | null;
        created_at: string | null;
        last_commit: string | null;
        commit_count: bigint;
      }>>(
        `SELECT
          r.rip_number,
          r.title,
          r.status,
          r.author,
          TO_CHAR(r.created_at, 'YYYY-MM-DD') AS created_at,
          TO_CHAR(MAX(rc.commit_date), 'YYYY-MM-DD') AS last_commit,
          COUNT(rc.id)::bigint AS commit_count
        FROM rips r
        LEFT JOIN rip_commits rc ON rc.rip_id = r.id
        WHERE ${whereClause}
        GROUP BY r.rip_number, r.title, r.status, r.author, r.created_at
        ORDER BY ${orderCol} ${orderDir} NULLS LAST
        LIMIT $${limitParam} OFFSET $${offsetParam}`,
        ...params
      );

      return {
        total,
        page: page ?? 1,
        pageSize: pageSize ?? 50,
        totalPages: Math.ceil(total / (pageSize ?? 50)),
        rows: rows.map(r => ({
          number: r.rip_number,
          title: r.title,
          status: r.status,
          author: r.author,
          createdAt: r.created_at,
          lastCommit: r.last_commit,
          commits: Number(r.commit_count),
        })),
      };
    }),

  // ——— RIP Activity Over Time ———
  getRIPActivity: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        month: string;
        count: bigint;
      }>>(
        `SELECT
          TO_CHAR(date_trunc('month', commit_date), 'YYYY-MM') AS month,
          COUNT(*)::bigint AS count
        FROM rip_commits
        WHERE commit_date >= '2020-01-01'
        GROUP BY date_trunc('month', commit_date)
        ORDER BY month ASC`
      );

      return results.map(r => ({
        month: r.month,
        count: Number(r.count),
      }));
    }),

  // ——— Status × Group Matrix (for homepage) ———
  getStatusMatrix: os
    .$context<Ctx>()
    .handler(async ({ context }) => {
      await checkAPIToken(context.headers);

      const results = await prisma.$queryRawUnsafe<Array<{
        status: string;
        group_name: string;
        count: bigint;
      }>>(
        `SELECT
          s.status,
          CASE
            WHEN s.category = 'ERC' OR LOWER(SPLIT_PART(r.name, '/', 2)) = 'ercs' THEN 'ERCs'
            ELSE 'EIPs'
          END AS group_name,
          COUNT(*)::bigint AS count
        FROM eip_snapshots s
        LEFT JOIN repositories r ON s.repository_id = r.id
        GROUP BY s.status, group_name
        ORDER BY count DESC`
      );

      return results.map(r => ({
        status: r.status,
        group: r.group_name,
        count: Number(r.count),
      }));
    }),

  // ——— CSV Export (EIPs/ERCs) ———
  exportCSV: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      status: z.array(z.string()).optional(),
      type: z.array(z.string()).optional(),
      category: z.array(z.string()).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      if (input.repo === 'rips') {
        const rows = await prisma.$queryRawUnsafe<Array<{
          rip_number: number;
          title: string | null;
          status: string | null;
          created_at: string | null;
          last_commit_at: string | null;
          commit_count: bigint;
        }>>(
          `SELECT
            r.rip_number,
            r.title,
            r.status,
            TO_CHAR(r.created_at, 'YYYY-MM-DD') AS created_at,
            TO_CHAR(MAX(rc.commit_date), 'YYYY-MM-DD') AS last_commit_at,
            COUNT(rc.id)::bigint AS commit_count
          FROM rips r
          LEFT JOIN rip_commits rc ON rc.rip_id = r.id
          GROUP BY r.rip_number, r.title, r.status, r.created_at
          ORDER BY r.rip_number ASC`
        );

        const header = 'rip_number,title,status,created_at,last_commit_at,commit_count';
        const csvRows = rows.map(r =>
          [r.rip_number, `"${(r.title ?? '').replace(/"/g, '""')}"`, r.status ?? '', r.created_at ?? '', r.last_commit_at ?? '', Number(r.commit_count)].join(',')
        );
        return { csv: [header, ...csvRows].join('\n'), filename: 'rips-standards.csv' };
      }

      // EIPs/ERCs export
      const conditions: string[] = ['1=1'];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (input.repo) {
        conditions.push(`LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($${paramIdx})`);
        params.push(input.repo);
        paramIdx++;
      }
      if (input.status && input.status.length > 0) {
        conditions.push(`s.status = ANY($${paramIdx}::text[])`);
        params.push(input.status);
        paramIdx++;
      }
      if (input.type && input.type.length > 0) {
        conditions.push(`s.type = ANY($${paramIdx}::text[])`);
        params.push(input.type);
        paramIdx++;
      }
      if (input.category && input.category.length > 0) {
        conditions.push(`s.category = ANY($${paramIdx}::text[])`);
        params.push(input.category);
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');

      const rows = await prisma.$queryRawUnsafe<Array<{
        repo: string;
        eip_number: number;
        title: string | null;
        status: string;
        type: string | null;
        category: string | null;
        created_at: string | null;
        updated_at: string;
        linked_prs: bigint;
      }>>(
        `SELECT
          COALESCE(SPLIT_PART(r.name, '/', 2), 'unknown') AS repo,
          e.eip_number,
          e.title,
          s.status,
          s.type,
          s.category,
          TO_CHAR(e.created_at, 'YYYY-MM-DD') AS created_at,
          TO_CHAR(s.updated_at, 'YYYY-MM-DD') AS updated_at,
          (SELECT COUNT(*)::bigint FROM pull_request_eips pre WHERE pre.eip_number = e.eip_number AND pre.repository_id = COALESCE(s.repository_id, r.id)) AS linked_prs
        FROM eip_snapshots s
        JOIN eips e ON s.eip_id = e.id
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ${whereClause}
        ORDER BY e.eip_number ASC`,
        ...params
      );

      const header = 'repo,number,title,status,type,category,created_at,last_updated_at,linked_prs';
      const csvRows = rows.map(r =>
        [r.repo, r.eip_number, `"${(r.title ?? '').replace(/"/g, '""')}"`, r.status, r.type ?? '', r.category ?? '', r.created_at ?? '', r.updated_at, Number(r.linked_prs)].join(',')
      );

      const repoLabel = input.repo ?? 'all';
      return { csv: [header, ...csvRows].join('\n'), filename: `${repoLabel}-standards.csv` };
    }),
};
