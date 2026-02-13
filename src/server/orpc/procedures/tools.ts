import { os, checkAPIToken, type Ctx } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

async function getRepoIds(repo?: string): Promise<number[] | null> {
  if (!repo) return null;
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    `SELECT id FROM repositories WHERE LOWER(type) = LOWER($1)`,
    repo === 'eips' ? 'EIPS' : repo === 'ercs' ? 'ERCS' : 'RIPS'
  );
  return rows.map((r) => r.id);
}

export const toolsProcedures = {
  // ──── Board: EIPs grouped by status (Kanban data) ────
  getBoardData: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      search: z.string().optional(),
      type: z.string().optional(),
      category: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

      const searchFilter = input.search
        ? `AND (ei.eip_number::text LIKE '%${input.search.replace(/'/g, "''")}%' OR LOWER(ei.title) LIKE '%${input.search.toLowerCase().replace(/'/g, "''")}%')`
        : '';
      const typeFilter = input.type ? `AND s.type = '${input.type.replace(/'/g, "''")}'` : '';
      const catFilter = input.category ? `AND s.category = '${input.category.replace(/'/g, "''")}'` : '';

      const results = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        title: string | null;
        status: string;
        type: string | null;
        category: string | null;
        author: string | null;
        repo_type: string;
        created_at: string | null;
        updated_at: string | null;
      }>>(
        `SELECT
          ei.eip_number,
          ei.title,
          s.status,
          s.type,
          s.category,
          ei.author,
          COALESCE(LOWER(r.type), 'unknown') AS repo_type,
          TO_CHAR(ei.created_at, 'YYYY-MM-DD') AS created_at,
          TO_CHAR(s.updated_at, 'YYYY-MM-DD') AS updated_at
        FROM eip_snapshots s
        JOIN eips ei ON s.eip_id = ei.id
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ($1::int[] IS NULL OR s.repository_id = ANY($1))
          ${searchFilter}
          ${typeFilter}
          ${catFilter}
        ORDER BY s.status, ei.eip_number DESC`,
        repoIds
      );

      // Group by status
      const statuses = ['Draft', 'Review', 'Last Call', 'Final', 'Stagnant', 'Withdrawn', 'Living'];
      const board: Record<string, Array<{
        eipNumber: number; title: string | null; type: string | null;
        category: string | null; author: string | null; repo: string;
        createdAt: string | null; updatedAt: string | null;
      }>> = {};

      for (const s of statuses) board[s] = [];

      for (const r of results) {
        const key = statuses.includes(r.status) ? r.status : 'Draft';
        board[key].push({
          eipNumber: r.eip_number,
          title: r.title,
          type: r.type,
          category: r.category,
          author: r.author,
          repo: r.repo_type,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        });
      }

      return board;
    }),

  // ──── Dependencies: EIP requires graph ────
  getDependencyGraph: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      eipNumber: z.number().optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

      // Get all EIPs with their requires field from eip_snapshots
      // The requires info is stored in the raw EIP files; we can parse from eip_status_events
      // For now, use a simpler approach: get status events that mention related EIPs
      // Actually, we need to check if there's a requires field somewhere

      // Use PR linkage as a proxy for relationships
      const results = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        title: string | null;
        status: string;
        repo_type: string;
        linked_eips: number[];
      }>>(
        `SELECT
          ei.eip_number,
          ei.title,
          s.status,
          COALESCE(LOWER(r.type), 'unknown') AS repo_type,
          COALESCE(
            ARRAY(
              SELECT DISTINCT ei2.eip_number
              FROM pull_request_eips pre1
              JOIN pull_request_eips pre2 ON pre1.pr_id = pre2.pr_id AND pre1.eip_id != pre2.eip_id
              JOIN eips ei2 ON pre2.eip_id = ei2.id
              WHERE pre1.eip_id = ei.id
            ),
            '{}'::int[]
          ) AS linked_eips
        FROM eip_snapshots s
        JOIN eips ei ON s.eip_id = ei.id
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ($1::int[] IS NULL OR s.repository_id = ANY($1))
          AND ($2::int IS NULL OR ei.eip_number = $2)
        ORDER BY ei.eip_number
        LIMIT 500`,
        repoIds,
        input.eipNumber ?? null
      );

      // Build nodes and edges
      const nodes = results.map((r) => ({
        id: r.eip_number,
        title: r.title,
        status: r.status,
        repo: r.repo_type,
      }));

      const edges: Array<{ source: number; target: number }> = [];
      const nodeIds = new Set(results.map((r) => r.eip_number));

      for (const r of results) {
        for (const linked of r.linked_eips) {
          if (nodeIds.has(linked) && r.eip_number < linked) {
            edges.push({ source: r.eip_number, target: linked });
          }
        }
      }

      return { nodes, edges };
    }),

  // ──── Timeline: Status events + commits for an EIP ────
  getEIPFullTimeline: os
    .$context<Ctx>()
    .input(z.object({
      eipNumber: z.number(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      // Get EIP info
      const info = await prisma.$queryRawUnsafe<Array<{
        title: string | null;
        author: string | null;
        status: string;
        type: string | null;
        category: string | null;
        created_at: string | null;
        repo_type: string;
      }>>(
        `SELECT ei.title, ei.author, s.status, s.type, s.category,
                TO_CHAR(ei.created_at, 'YYYY-MM-DD') AS created_at,
                COALESCE(LOWER(r.type), 'unknown') AS repo_type
         FROM eip_snapshots s
         JOIN eips ei ON s.eip_id = ei.id
         LEFT JOIN repositories r ON s.repository_id = r.id
         WHERE ei.eip_number = $1`,
        input.eipNumber
      );

      // Status events
      const statusEvents = await prisma.$queryRawUnsafe<Array<{
        from_status: string | null;
        to_status: string;
        changed_at: string;
        pr_number: number | null;
        commit_sha: string;
      }>>(
        `SELECT e.from_status, e.to_status,
                TO_CHAR(e.changed_at, 'YYYY-MM-DD HH24:MI') AS changed_at,
                e.pr_number, e.commit_sha
         FROM eip_status_events e
         JOIN eips ei ON e.eip_id = ei.id
         WHERE ei.eip_number = $1
         ORDER BY e.changed_at ASC`,
        input.eipNumber
      );

      // Category events
      const categoryEvents = await prisma.$queryRawUnsafe<Array<{
        from_category: string | null;
        to_category: string;
        changed_at: string;
      }>>(
        `SELECT e.from_category, e.to_category,
                TO_CHAR(e.changed_at, 'YYYY-MM-DD HH24:MI') AS changed_at
         FROM eip_category_events e
         JOIN eips ei ON e.eip_id = ei.id
         WHERE ei.eip_number = $1
         ORDER BY e.changed_at ASC`,
        input.eipNumber
      );

      // Deadline events
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

      // Linked PRs with commit info
      const linkedPRs = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        title: string | null;
        author: string | null;
        state: string | null;
        merged_at: string | null;
        created_at: string | null;
        num_commits: number | null;
        num_files: number | null;
        repo_name: string;
      }>>(
        `SELECT p.pr_number, p.title, p.author, p.state,
                TO_CHAR(p.merged_at, 'YYYY-MM-DD') AS merged_at,
                TO_CHAR(p.created_at, 'YYYY-MM-DD') AS created_at,
                p.num_commits, p.num_files,
                COALESCE(r.name, 'unknown') AS repo_name
         FROM pull_requests p
         JOIN pull_request_eips pre ON pre.pr_number = p.pr_number AND pre.repository_id = p.repository_id
         LEFT JOIN repositories r ON p.repository_id = r.id
         WHERE pre.eip_number = $1
         ORDER BY p.created_at ASC`,
        input.eipNumber
      );

      const eipInfo = info[0] ?? null;

      return {
        eipNumber: input.eipNumber,
        title: eipInfo?.title ?? null,
        author: eipInfo?.author ?? null,
        currentStatus: eipInfo?.status ?? null,
        type: eipInfo?.type ?? null,
        category: eipInfo?.category ?? null,
        createdAt: eipInfo?.created_at ?? null,
        repo: eipInfo?.repo_type ?? 'unknown',
        statusEvents: statusEvents.map((e) => ({
          from: e.from_status,
          to: e.to_status,
          date: e.changed_at,
          prNumber: e.pr_number,
          commitSha: e.commit_sha,
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
          createdAt: p.created_at,
          commits: p.num_commits ?? 0,
          files: p.num_files ?? 0,
          repo: p.repo_name,
        })),
      };
    }),

  // ──── Board filter options ────
  getBoardFilterOptions: os
    .$context<Ctx>()
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);
      const repoIds = await getRepoIds(input.repo);

      const types = await prisma.$queryRawUnsafe<Array<{ val: string }>>(
        `SELECT DISTINCT s.type AS val FROM eip_snapshots s
         WHERE s.type IS NOT NULL AND ($1::int[] IS NULL OR s.repository_id = ANY($1))
         ORDER BY val`,
        repoIds
      );

      const categories = await prisma.$queryRawUnsafe<Array<{ val: string }>>(
        `SELECT DISTINCT s.category AS val FROM eip_snapshots s
         WHERE s.category IS NOT NULL AND ($1::int[] IS NULL OR s.repository_id = ANY($1))
         ORDER BY val`,
        repoIds
      );

      return {
        types: types.map((t) => t.val),
        categories: categories.map((c) => c.val),
      };
    }),
};
