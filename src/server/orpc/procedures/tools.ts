import { optionalAuthProcedure, type Ctx } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

const REPO_TYPE: Record<string, string> = { eips: 'EIPS', ercs: 'ERCS', rips: 'RIPS' };

async function getRepoIds(repo?: string | string[]): Promise<number[] | null> {
  const list = (Array.isArray(repo) ? repo : repo ? [repo] : []).map((r) => REPO_TYPE[r]).filter(Boolean);
  if (list.length === 0) return null; // null = all repos
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    `SELECT id FROM repositories WHERE UPPER(type) = ANY($1::text[])`,
    list
  );
  return rows.map((r) => r.id);
}

/* SQL fragment: classify open PRs by process type */
const PROCESS_TYPE_SQL = `CASE
  WHEN LOWER(COALESCE(p.title, '')) ~ 'typo|spelling|grammar|editorial' THEN 'Typo'
  WHEN p.labels @> ARRAY['c-new']::text[] THEN 'New EIP'
  WHEN LOWER(COALESCE(p.title, '')) ~ 'website|jekyll|_config' THEN 'Website'
  WHEN LOWER(COALESCE(p.title, '')) ~ 'update eip-1[: ]' OR LOWER(COALESCE(p.title, '')) = 'update eip-1' THEN 'EIP-1'
  -- Only c-status is a real status change (the eth-bot sets it when the preamble status: line
  -- changes). c-update just means "edits an existing proposal" = a Content Edit, NOT a Status
  -- Change. We can't diff-check (PR file contents aren't stored) and title matching is too noisy
  -- ("remove ... -> ..." etc.), so the label is the reliable signal.
  WHEN p.labels @> ARRAY['c-status']::text[] THEN 'Status Change'
  ELSE 'Content Edit'
END`;

export const toolsProcedures = {
  // ──── Board: EIPs grouped by status (Kanban data) ────
  getBoardData: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      search: z.string().optional(),
      type: z.string().optional(),
      category: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
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
  getDependencyGraph: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      eipNumber: z.number().optional(),
    }))
    .handler(async ({ context, input }) => {
      const repoIds = await getRepoIds(input.repo);

      // Use shared PR linkage as dependency/relationship proxy.
      // pull_request_eips schema is (pr_number, repository_id, eip_number)
      // so joins must use pr_number + repository_id.
      const nodesResult = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        title: string | null;
        status: string;
        repo_type: string;
      }>>(
        `SELECT
          ei.eip_number,
          ei.title,
          s.status,
          COALESCE(LOWER(r.type), 'unknown') AS repo_type
        FROM eip_snapshots s
        JOIN eips ei ON s.eip_id = ei.id
        LEFT JOIN repositories r ON s.repository_id = r.id
        WHERE ($1::int[] IS NULL OR s.repository_id = ANY($1))
          AND (
            $2::int IS NULL
            OR ei.eip_number = $2
            OR ei.eip_number IN (
              SELECT DISTINCT
                CASE
                  WHEN pre1.eip_number = $2 THEN pre2.eip_number
                  ELSE pre1.eip_number
                END
              FROM pull_request_eips pre1
              JOIN pull_request_eips pre2
                ON pre1.pr_number = pre2.pr_number
               AND pre1.repository_id = pre2.repository_id
               AND pre1.eip_number <> pre2.eip_number
              WHERE ($1::int[] IS NULL OR pre1.repository_id = ANY($1))
                AND (pre1.eip_number = $2 OR pre2.eip_number = $2)
            )
          )
        ORDER BY ei.eip_number
        LIMIT 1200`,
        repoIds,
        input.eipNumber ?? null
      );

      const edgeResult = await prisma.$queryRawUnsafe<Array<{
        source: number;
        target: number;
      }>>(
        `SELECT DISTINCT
          LEAST(pre1.eip_number, pre2.eip_number) AS source,
          GREATEST(pre1.eip_number, pre2.eip_number) AS target
         FROM pull_request_eips pre1
         JOIN pull_request_eips pre2
           ON pre1.pr_number = pre2.pr_number
          AND pre1.repository_id = pre2.repository_id
          AND pre1.eip_number <> pre2.eip_number
         WHERE ($1::int[] IS NULL OR pre1.repository_id = ANY($1))
           AND ($2::int IS NULL OR pre1.eip_number = $2 OR pre2.eip_number = $2)
         LIMIT 6000`,
        repoIds,
        input.eipNumber ?? null
      );

      // Build nodes and edges
      const nodes = nodesResult.map((r) => ({
        id: r.eip_number,
        title: r.title,
        status: r.status,
        repo: r.repo_type,
      }));

      const nodeIds = new Set(nodes.map((r) => r.id));
      const edges = edgeResult
        .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((e) => ({ source: e.source, target: e.target }));

      return { nodes, edges };
    }),

  // ──── Timeline: Status events + commits for an EIP ────
  getEIPFullTimeline: optionalAuthProcedure
    .input(z.object({
      eipNumber: z.number(),
    }))
    .handler(async ({ context, input }) => {
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
  getBoardFilterOptions: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
    }))
    .handler(async ({ context, input }) => {
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

  // ──── Open PRs Board: paginated list with governance state & classification ────
  getOpenPRBoard: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      repos: z.array(z.enum(['eips', 'ercs', 'rips'])).optional(),
      govState: z.union([z.string(), z.array(z.string())]).optional(),
      processType: z.union([z.string(), z.array(z.string())]).optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(10),
      sortBy: z.enum(['wait', 'pr', 'created']).default('wait'),
      sortDir: z.enum(['asc', 'desc']).default('desc'),
      // Editorial signals the scheduler computes in pr_governance_state.
      needsAttention: z.boolean().optional(),
      hasConflicts: z.boolean().optional(),
    }))
    .handler(async ({ context, input }) => {
const { repo, govState, processType, search, page, pageSize, sortBy, sortDir, needsAttention, hasConflicts } = input;
      const offset = (page - 1) * pageSize;
      const govStates = typeof govState === 'string' ? [govState] : (govState ?? []);
      const processTypes = typeof processType === 'string' ? [processType] : (processType ?? []);

      // Whitelisted so the raw query can never take user-controlled SQL.
      const ORDER_COLUMNS = { wait: 'f.wait_days', pr: 'f.pr_number', created: 'f.created_at' } as const;
      const orderColumn = ORDER_COLUMNS[sortBy];
      const orderDirection = sortDir === 'asc' ? 'ASC' : 'DESC';

      const results = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        title: string | null;
        author: string | null;
        created_at: string;
        labels: string[];
        repo_name: string;
        repo_short: string;
        gov_state: string;
        wait_days: number;
        process_type: string;
        needs_attention: boolean;
        attention_reason: string | null;
        has_conflicts: boolean;
        stagnant_preamble: boolean;
        ethbot_review: boolean;
        author_is_preamble_author: boolean;
        has_participants: boolean;
        total_count: bigint;
      }>>(`
        WITH base AS (
          SELECT
            p.pr_number,
            p.title,
            p.author,
            TO_CHAR(p.created_at, 'YYYY-MM-DD') AS created_at,
            p.labels,
            r.name AS repo_name,
            LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short,
            COALESCE(
              gs.subcategory,
              CASE COALESCE(gs.current_state, 'NO_STATE')
                WHEN 'WAITING_ON_EDITOR' THEN 'Waiting on Editor'
                WHEN 'WAITING_ON_AUTHOR' THEN 'Waiting on Author'
                WHEN 'DRAFT' THEN 'AWAITED'
                ELSE 'Uncategorized'
              END
            ) AS gov_state,
            GREATEST(EXTRACT(DAY FROM (NOW() - COALESCE(gs.waiting_since, p.created_at, NOW())))::int, 0) AS wait_days,
            CASE WHEN COALESCE(gs.category, '') = 'Tooling' THEN 'Content Edit'
              ELSE COALESCE(gs.category, ${PROCESS_TYPE_SQL})
            END AS process_type,
            COALESCE(gs.needs_editor_attention, false) AS needs_attention,
            gs.reason AS attention_reason,
            COALESCE(gs.has_merge_conflicts, false) AS has_conflicts,
            COALESCE(gs.has_stagnant_preamble_status, false) AS stagnant_preamble,
            COALESCE(gs.ethbot_needs_editor_review, false) AS ethbot_review,
            COALESCE(gs.opened_by_preamble_author, false) AS author_is_preamble_author,
            COALESCE(gs.has_other_participants, false) AS has_participants
          FROM pull_requests p
          JOIN repositories r ON p.repository_id = r.id
          LEFT JOIN pr_governance_state gs
            ON p.pr_number = gs.pr_number AND p.repository_id = gs.repository_id
          WHERE p.state = 'open'
            AND ($1::text[] IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = ANY($1::text[]))
            AND COALESCE(gs.category, '') != 'Tooling'
        ),
        filtered AS (
          SELECT * FROM base
          WHERE ($2::text[] IS NULL OR cardinality($2::text[]) = 0 OR gov_state = ANY($2::text[]))
            AND ($3::text[] IS NULL OR cardinality($3::text[]) = 0 OR process_type = ANY($3::text[]))
            AND ($4::text IS NULL OR (
              pr_number::text LIKE '%' || $4 || '%'
              OR LOWER(COALESCE(title, '')) LIKE '%' || LOWER($4) || '%'
              OR LOWER(COALESCE(author, '')) LIKE '%' || LOWER($4) || '%'
            ))
            AND ($7::boolean IS NULL OR needs_attention = $7)
            AND ($8::boolean IS NULL OR has_conflicts = $8)
        )
        SELECT f.*, (SELECT COUNT(*) FROM filtered)::bigint AS total_count
        FROM filtered f
        ORDER BY ${orderColumn} ${orderDirection}, f.pr_number DESC
        LIMIT $5 OFFSET $6
      `, (input.repos && input.repos.length ? input.repos : repo ? [repo] : null), govStates.length ? govStates : null, processTypes.length ? processTypes : null, search || null, pageSize, offset, needsAttention ?? null, hasConflicts ?? null);

      const total = results.length > 0 ? Number(results[0].total_count) : 0;

      return {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
        rows: results.map(r => ({
          prNumber: r.pr_number,
          title: r.title,
          author: r.author,
          createdAt: r.created_at,
          labels: Array.isArray(r.labels) ? r.labels : [],
          repo: r.repo_name,
          repoShort: r.repo_short,
          govState: r.gov_state,
          waitDays: r.wait_days,
          processType: r.process_type,
          needsAttention: r.needs_attention,
          attentionReason: r.attention_reason,
          hasConflicts: r.has_conflicts,
          stagnantPreamble: r.stagnant_preamble,
          ethbotReview: r.ethbot_review,
          authorIsPreambleAuthor: r.author_is_preamble_author,
          hasParticipants: r.has_participants,
        })),
      };
    }),

  // ──── Open PRs Board Stats: process type + governance state counts ────
  getOpenPRBoardStats: optionalAuthProcedure
    .input(z.object({
      repo: z.enum(['eips', 'ercs', 'rips']).optional(),
      repos: z.array(z.enum(['eips', 'ercs', 'rips'])).optional(),
      govState: z.union([z.string(), z.array(z.string())]).optional(),
      search: z.string().optional(),
    }))
    .handler(async ({ context, input }) => {
const { repo, repos, govState, search } = input;
const repoArg = repos && repos.length ? repos : repo ? [repo] : null;
      const govStates = typeof govState === 'string' ? [govState] : (govState ?? []);

      // Process type counts (filtered by govState + search, NOT by processType)
      const ptResults = await prisma.$queryRawUnsafe<Array<{
        process_type: string; count: bigint;
      }>>(`
        WITH base AS (
          SELECT
            p.pr_number, p.title, p.author,
            COALESCE(
              gs.subcategory,
              CASE COALESCE(gs.current_state, 'NO_STATE')
                WHEN 'WAITING_ON_EDITOR' THEN 'Waiting on Editor'
                WHEN 'WAITING_ON_AUTHOR' THEN 'Waiting on Author'
                WHEN 'DRAFT' THEN 'AWAITED'
                ELSE 'Uncategorized'
              END
            ) AS gov_state,
            CASE WHEN COALESCE(gs.category, '') = 'Tooling' THEN 'Content Edit'
              ELSE COALESCE(gs.category, ${PROCESS_TYPE_SQL})
            END AS process_type
          FROM pull_requests p
          JOIN repositories r ON p.repository_id = r.id
          LEFT JOIN pr_governance_state gs
            ON p.pr_number = gs.pr_number AND p.repository_id = gs.repository_id
          WHERE p.state = 'open'
            AND ($1::text[] IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = ANY($1::text[]))
            -- Match the board list + other facet counts, which drop Tooling PRs
            -- entirely. Without this, Tooling rows were folded into "Content Edit"
            -- and inflated its count (e.g. 14) while the list showed 0.
            AND COALESCE(gs.category, '') != 'Tooling'
        )
        SELECT process_type, COUNT(*)::bigint AS count
        FROM base
        WHERE ($2::text[] IS NULL OR cardinality($2::text[]) = 0 OR gov_state = ANY($2::text[]))
          AND ($3::text IS NULL OR (
            pr_number::text LIKE '%' || $3 || '%'
            OR LOWER(COALESCE(title, '')) LIKE '%' || LOWER($3) || '%'
            OR LOWER(COALESCE(author, '')) LIKE '%' || LOWER($3) || '%'
          ))
        GROUP BY process_type
        ORDER BY count DESC
      `, repoArg, govStates.length ? govStates : null, search || null);

      // Governance state counts (NOT filtered by govState—so user sees all state counts)
      const gsResults = await prisma.$queryRawUnsafe<Array<{
        state: string; label: string; count: bigint;
      }>>(`
        SELECT
          COALESCE(
            gs.subcategory,
            CASE COALESCE(gs.current_state, 'NO_STATE')
              WHEN 'WAITING_ON_EDITOR' THEN 'Waiting on Editor'
              WHEN 'WAITING_ON_AUTHOR' THEN 'Waiting on Author'
              WHEN 'DRAFT' THEN 'AWAITED'
              ELSE 'Uncategorized'
            END
          ) AS state,
          COALESCE(
            gs.subcategory,
            CASE COALESCE(gs.current_state, 'NO_STATE')
              WHEN 'WAITING_ON_EDITOR' THEN 'Waiting on Editor'
              WHEN 'WAITING_ON_AUTHOR' THEN 'Waiting on Author'
              WHEN 'DRAFT' THEN 'AWAITED'
              ELSE 'Uncategorized'
            END
          ) AS label,
          COUNT(*)::bigint AS count
        FROM pull_requests p
        JOIN repositories r ON p.repository_id = r.id
        LEFT JOIN pr_governance_state gs
          ON p.pr_number = gs.pr_number AND p.repository_id = gs.repository_id
        WHERE p.state = 'open'
          AND ($1::text[] IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = ANY($1::text[]))
          AND ($2::text IS NULL OR (
            p.pr_number::text LIKE '%' || $2 || '%'
            OR LOWER(COALESCE(p.title, '')) LIKE '%' || LOWER($2) || '%'
            OR LOWER(COALESCE(p.author, '')) LIKE '%' || LOWER($2) || '%'
          ))
          AND COALESCE(gs.category, '') != 'Tooling'
        GROUP BY state, label
        ORDER BY count DESC
      `, repoArg, search || null);

      // Editorial-signal counts (filtered by repo + govState + search, same as the board list).
      const signalResults = await prisma.$queryRawUnsafe<Array<{
        needs_attention: bigint; has_conflicts: bigint;
      }>>(`
        WITH base AS (
          SELECT
            p.pr_number, p.title, p.author,
            COALESCE(
              gs.subcategory,
              CASE COALESCE(gs.current_state, 'NO_STATE')
                WHEN 'WAITING_ON_EDITOR' THEN 'Waiting on Editor'
                WHEN 'WAITING_ON_AUTHOR' THEN 'Waiting on Author'
                WHEN 'DRAFT' THEN 'AWAITED'
                ELSE 'Uncategorized'
              END
            ) AS gov_state,
            COALESCE(gs.needs_editor_attention, false) AS needs_attention,
            COALESCE(gs.has_merge_conflicts, false) AS has_conflicts
          FROM pull_requests p
          JOIN repositories r ON p.repository_id = r.id
          LEFT JOIN pr_governance_state gs
            ON p.pr_number = gs.pr_number AND p.repository_id = gs.repository_id
          WHERE p.state = 'open'
            AND ($1::text[] IS NULL OR LOWER(SPLIT_PART(r.name, '/', 2)) = ANY($1::text[]))
            AND COALESCE(gs.category, '') != 'Tooling'
        )
        SELECT
          COUNT(*) FILTER (WHERE needs_attention)::bigint AS needs_attention,
          COUNT(*) FILTER (WHERE has_conflicts)::bigint AS has_conflicts
        FROM base
        WHERE ($2::text[] IS NULL OR cardinality($2::text[]) = 0 OR gov_state = ANY($2::text[]))
          AND ($3::text IS NULL OR (
            pr_number::text LIKE '%' || $3 || '%'
            OR LOWER(COALESCE(title, '')) LIKE '%' || LOWER($3) || '%'
            OR LOWER(COALESCE(author, '')) LIKE '%' || LOWER($3) || '%'
          ))
      `, repoArg, govStates.length ? govStates : null, search || null);

      return {
        processTypes: ptResults.map(r => ({ type: r.process_type, count: Number(r.count) })),
        govStates: gsResults.map(r => ({ state: r.state, label: r.label, count: Number(r.count) })),
        totalOpen: gsResults.reduce((sum, r) => sum + Number(r.count), 0),
        needsAttention: Number(signalResults[0]?.needs_attention ?? 0),
        hasConflicts: Number(signalResults[0]?.has_conflicts ?? 0),
      };
    }),

  // ──── Agenda candidates: open PRs pre-bucketed for the EIP Editing Office Hour agenda ────
  // Status-change moves (To Final / Last Call / Review) come from `c-status` titles ("Move to X")
  // — there is no s-lastcall label, so the title is the only signal that covers Last Call. The
  // Draft pool is the s-draft label (new proposals + move-to-draft), excluding the multi-status
  // meta doc (EIP-1) via the single-status-label guard.
  getAgendaCandidates: optionalAuthProcedure
    .input(z.object({}))
    .handler(async () => {
      const rows = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        title: string | null;
        author: string | null;
        repo_name: string;
        repo_short: string;
        is_new: boolean;
        wait_days: number;
        waiting_state: string | null;
        bucket: string;
      }>>(`
        WITH glam AS (
          SELECT c.eip_number
          FROM upgrade_composition_current c
          JOIN upgrades u ON c.upgrade_id = u.id
          WHERE u.slug = 'glamsterdam'
        ),
        base AS (
          SELECT
            p.pr_number,
            p.title,
            p.author,
            r.name AS repo_name,
            LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short,
            p.labels @> ARRAY['c-new']::text[] AS is_new,
            p.labels @> ARRAY['c-status']::text[] AS is_status_change,
            p.labels @> ARRAY['s-draft']::text[] AS is_s_draft,
            (SELECT COUNT(*) FROM unnest(p.labels) l WHERE l LIKE 's-%') AS status_label_count,
            GREATEST(EXTRACT(DAY FROM (NOW() - COALESCE(gs.waiting_since, p.created_at, NOW())))::int, 0) AS wait_days,
            gs.current_state AS waiting_state,
            LOWER(COALESCE(p.title, '')) AS lt,
            NULLIF((regexp_match(p.title, '(?:EIP|ERC)-(\\d+)'))[1], '')::int AS eip_num
          FROM pull_requests p
          JOIN repositories r ON p.repository_id = r.id
          LEFT JOIN pr_governance_state gs
            ON p.pr_number = gs.pr_number AND p.repository_id = gs.repository_id
          WHERE p.state = 'open'
        )
        SELECT pr_number, title, author, repo_name, repo_short, is_new, wait_days, waiting_state,
          CASE
            WHEN is_status_change AND lt ~ 'move to final' THEN 'final'
            WHEN is_status_change AND lt ~ 'move to last call' THEN 'lastcall'
            WHEN is_status_change AND lt ~ 'move to review' AND eip_num IN (SELECT eip_number FROM glam) THEN 'glamsterdam'
            WHEN is_status_change AND lt ~ 'move to review' THEN 'review'
            ELSE 'draft'
          END AS bucket
        FROM base
        WHERE
          -- The office-hour agenda is the editor's review list, so only surface
          -- PRs that are actually waiting on an editor (not blocked on the author).
          waiting_state = 'WAITING_ON_EDITOR'
          AND (
            (is_status_change AND lt ~ 'move to (final|last call|review)')
            OR (is_s_draft AND status_label_count = 1 AND (is_new OR is_status_change))
          )
        ORDER BY repo_short, pr_number DESC
      `);

      return rows.map(r => ({
        prNumber: r.pr_number,
        title: r.title,
        author: r.author,
        repo: r.repo_name,
        repoShort: r.repo_short,
        url: `https://github.com/${r.repo_name}/pull/${r.pr_number}`,
        isNew: r.is_new,
        waitDays: r.wait_days,
        waitingState: r.waiting_state,
        bucket: r.bucket as 'final' | 'lastcall' | 'review' | 'glamsterdam' | 'draft',
      }));
    }),

  /**
   * Open PRs whose EIPs were referenced on an ACD agenda (ethereum/pm).
   *
   * Agenda issues name EIPs, not PRs — so the join is
   *   pm_agenda_eips.eip_number -> pull_request_eips -> pull_requests (open only).
   * One row per PR, with every agenda that mentioned its EIP aggregated into
   * `mentions` so an editor can see which call it is queued for and who raised it.
   */
  getAgendaPRs: optionalAuthProcedure
    .input(
      z.object({
        /** Filter to one ACD series (acde/acdc/acdt/acdtcl). */
        series: z.enum(['acde', 'acdc', 'acdt', 'acdtcl']).optional(),
        /** 'upcoming' = agendas for calls not yet held; 'all' includes past calls. */
        window: z.enum(['upcoming', 'all']).default('all'),
        /** Restrict to PRs whose governance state is waiting on the editor / author. */
        waitingOn: z.enum(['editor', 'author']).optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(25),
      })
    )
    .handler(async ({ input }) => {
      const { series, window, waitingOn, search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;
      const q = search?.trim() ?? '';
      const waitingState =
        waitingOn === 'editor' ? 'WAITING_ON_EDITOR' : waitingOn === 'author' ? 'WAITING_ON_AUTHOR' : null;

      // pm_agenda_eips is created by a migration and filled by the scheduler, so
      // between deploying this code and running either one the table is simply
      // absent. That's an expected setup state, not a server fault — report it as
      // `ready: false` so the UI can explain it instead of surfacing a 500.
      const [{ exists }] = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT to_regclass('public.pm_agenda_eips') IS NOT NULL AS exists`
      );
      if (!exists) {
        return { ready: false as const, total: 0, totalPages: 1, rows: [] };
      }

      // The CI columns land in a separate scheduler migration, so between
      // deploying this code and running that migration they may not exist yet.
      // Degrade gracefully (no CI flag) instead of 500ing the whole agenda.
      const [{ has_ci_cols }] = await prisma.$queryRawUnsafe<Array<{ has_ci_cols: boolean }>>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'pr_governance_state'
             AND column_name = 'has_failing_required_checks'
         ) AS has_ci_cols`
      );
      const ciSelect = has_ci_cols
        ? `COALESCE(g.has_failing_required_checks, false) AS ci_failing, g.ci_state, g.failing_checks`
        : `false AS ci_failing, NULL::text AS ci_state, NULL::text[] AS failing_checks`;

      const rows = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        title: string;
        author: string | null;
        repo_short: string;
        created_at: string;
        eip_numbers: number[];
        mentions: unknown;
        next_call_on: string | null;
        waiting_state: string | null;
        ci_failing: boolean;
        ci_state: string | null;
        failing_checks: string[] | null;
        total_count: bigint;
      }>>(
        `
        WITH agenda AS (
          SELECT a.*
          FROM pm_agenda_eips a
          WHERE ($1::text IS NULL OR a.series = $1)
            -- "upcoming" keys off the call date, not issue state: an agenda issue
            -- can be closed while its call is still ahead, and vice versa.
            AND ($2::text = 'all' OR a.occurs_on >= CURRENT_DATE)
        ),
        matched AS (
          SELECT
            p.pr_number,
            p.title,
            p.author,
            LOWER(SPLIT_PART(r.name, '/', 2)) AS repo_short,
            TO_CHAR(p.created_at, 'YYYY-MM-DD') AS created_at,
            g.current_state AS waiting_state,
            ${ciSelect},
            pe.eip_number,
            a.issue_number, a.issue_title, a.issue_url, a.series, a.call_number,
            a.occurs_on, a.mentioned_by, a.snippet, a.source, a.source_url
          FROM agenda a
          JOIN pull_request_eips pe ON pe.eip_number = a.eip_number
          JOIN pull_requests p
            ON p.pr_number = pe.pr_number AND p.repository_id = pe.repository_id
          JOIN repositories r ON r.id = p.repository_id
          LEFT JOIN pr_governance_state g
            ON g.pr_number = p.pr_number AND g.repository_id = p.repository_id
          WHERE p.state = 'open'
            AND ($6::text IS NULL OR g.current_state = $6)
            AND ($3::text = '' OR p.title ILIKE '%' || $3 || '%'
                 OR p.author ILIKE '%' || $3 || '%'
                 OR CAST(pe.eip_number AS text) ILIKE '%' || $3 || '%')
        ),
        grouped AS (
          SELECT
            pr_number, title, author, repo_short, created_at, waiting_state,
            ci_failing, ci_state, failing_checks,
            ARRAY_AGG(DISTINCT eip_number) AS eip_numbers,
            -- TO_CHAR, not the bare DATE: node-postgres hydrates DATE columns into
            -- JS Date objects at local midnight, so a 2025-03-13 call comes back as
            -- 2025-03-12T18:30Z under a +05:30 offset and renders as the wrong day.
            -- A plain YYYY-MM-DD string has no timezone to get wrong.
            TO_CHAR(
              MIN(occurs_on) FILTER (WHERE occurs_on >= CURRENT_DATE), 'YYYY-MM-DD'
            ) AS next_call_on,
            JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
              'issueNumber', issue_number, 'issueTitle', issue_title,
              'issueUrl', issue_url, 'series', series, 'callNumber', call_number,
              'occursOn', TO_CHAR(occurs_on, 'YYYY-MM-DD'), 'mentionedBy', mentioned_by,
              'snippet', snippet, 'source', source, 'sourceUrl', source_url,
              'eip', eip_number
            )) AS mentions
          FROM matched
          GROUP BY pr_number, title, author, repo_short, created_at, waiting_state,
                   ci_failing, ci_state, failing_checks
        )
        SELECT *, COUNT(*) OVER()::bigint AS total_count
        FROM grouped
        -- Calls happening soonest first; PRs with no upcoming call fall to the end.
        ORDER BY next_call_on ASC NULLS LAST, pr_number DESC
        LIMIT $4 OFFSET $5
        `,
        series ?? null,
        window,
        q,
        pageSize,
        offset,
        waitingState
      );

      const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
      return {
        ready: true as const,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        rows: rows.map((r) => ({
          prNumber: r.pr_number,
          title: r.title,
          author: r.author,
          repo: r.repo_short,
          createdAt: r.created_at,
          eipNumbers: r.eip_numbers ?? [],
          nextCallOn: r.next_call_on,
          waitingOn: r.waiting_state,
          ciFailing: r.ci_failing ?? false,
          ciState: r.ci_state,
          failingChecks: r.failing_checks ?? [],
          mentions: (r.mentions ?? []) as Array<{
            issueNumber: number;
            issueTitle: string | null;
            issueUrl: string | null;
            series: string | null;
            callNumber: string | null;
            occursOn: string | null;
            mentionedBy: string | null;
            snippet: string | null;
            source: string;
            sourceUrl: string | null;
            eip: number;
          }>,
        })),
      };
    }),
};
