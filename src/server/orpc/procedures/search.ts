import { protectedProcedure, type Ctx, ORPCError } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const searchProcedures = {
  // Search proposals (EIPs, ERCs, RIPs)
  searchProposals: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {
const searchTerm = `%${input.query}%`;
      const numericQuery = input.query.replace(/[^\d]/g, '');
      const exactNumber = numericQuery ? parseInt(numericQuery, 10) : null;
      const exactTitle = input.query.trim().toLowerCase();

      // Get all matching proposals first
      const allResults = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        title: string | null;
        author: string | null;
        status: string;
        type: string | null;
        category: string | null;
        repo: string;
      }>>(`
        SELECT
          e.eip_number,
          e.title,
          e.author,
          s.status,
          s.type,
          s.category,
          r.name AS repo
        FROM eips e
        JOIN eip_snapshots s ON s.eip_id = e.id
        JOIN repositories r ON r.id = s.repository_id
        WHERE
          e.eip_number::text ILIKE $1
          OR e.title ILIKE $1
          OR e.author ILIKE $1
          OR s.status ILIKE $1
          OR s.type ILIKE $1
          OR s.category ILIKE $1
        LIMIT $2
      `, searchTerm, input.limit * 2); // Get more to score and filter

      // Score and sort results
      const scoredResults = allResults.map(r => {
        let score = 0;
        const eipNumberStr = r.eip_number.toString();
        const titleLower = (r.title || '').toLowerCase();
        
        // Exact EIP number match
        if (exactNumber && r.eip_number === exactNumber) {
          score += 1000;
        }
        // Starts with number
        else if (numericQuery && eipNumberStr.startsWith(numericQuery)) {
          score += 600;
        }
        // Title exact match
        if (titleLower === exactTitle) {
          score += 800;
        }
        // Title contains
        else if (titleLower.includes(exactTitle)) {
          score += 300;
        }
        // Author match
        if (r.author && r.author.toLowerCase().includes(input.query.toLowerCase())) {
          score += 200;
        }
        // Status match
        if (r.status.toLowerCase().includes(input.query.toLowerCase())) {
          score += 100;
        }
        // Category match
        if (r.category && r.category.toLowerCase().includes(input.query.toLowerCase())) {
          score += 80;
        }
        // Type match
        if (r.type && r.type.toLowerCase().includes(input.query.toLowerCase())) {
          score += 80;
        }
        
        return { ...r, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.eip_number - b.eip_number;
      })
      .slice(0, input.limit);

      return scoredResults.map(r => ({
        kind: 'proposal' as const,
        number: r.eip_number,
        repo: r.repo.includes('EIPs') ? 'eip' : r.repo.includes('ERCs') ? 'erc' : 'rip',
        title: r.title || '',
        status: r.status,
        category: r.category || null,
        type: r.type || null,
        author: r.author || null,
        score: r.score,
      }));
    }),

  // Search authors/people (from EIPs, PRs, Issues, and contributor_activity)
  searchAuthors: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {
const searchTerm = `%${input.query}%`;

      // Get actors from PRs, Issues, and contributor_activity - simplified without EIP matching for now
      const results = await prisma.$queryRawUnsafe<Array<{
        actor: string;
        role: string | null;
        eip_count: bigint;
        pr_count: bigint;
        issue_count: bigint;
        review_count: bigint;
        last_activity: Date | null;
      }>>(`
        WITH all_actors AS (
          SELECT DISTINCT author AS actor
          FROM pull_requests
          WHERE author IS NOT NULL AND author != '' AND author ILIKE $1
          UNION
          SELECT DISTINCT author AS actor
          FROM issues
          WHERE author IS NOT NULL AND author != '' AND author ILIKE $1
          UNION
          SELECT DISTINCT actor
          FROM contributor_activity
          WHERE actor IS NOT NULL AND actor != '' AND actor ILIKE $1
        ),
        pr_counts AS (
          SELECT author AS actor, COUNT(*)::bigint AS pr_count
          FROM pull_requests
          WHERE author IS NOT NULL AND author ILIKE $1
          GROUP BY author
        ),
        issue_counts AS (
          SELECT author AS actor, COUNT(*)::bigint AS issue_count
          FROM issues
          WHERE author IS NOT NULL AND author ILIKE $1
          GROUP BY author
        ),
        activity_stats AS (
          SELECT
            actor,
            COUNT(*) FILTER (WHERE action_type = 'reviewed')::bigint AS review_count,
            MAX(occurred_at) AS last_activity,
            MAX(role) AS role
          FROM contributor_activity
          WHERE actor IS NOT NULL AND actor ILIKE $1
          GROUP BY actor
        ),
        eip_counts AS (
          SELECT
            aa.actor,
            COUNT(*)::bigint AS eip_count
          FROM all_actors aa
          JOIN eips e ON e.author ILIKE '%' || aa.actor || '%'
          GROUP BY aa.actor
        )
        SELECT
          aa.actor,
          act.role,
          COALESCE(ec.eip_count, 0)::bigint AS eip_count,
          COALESCE(pc.pr_count, 0)::bigint AS pr_count,
          COALESCE(ic.issue_count, 0)::bigint AS issue_count,
          COALESCE(act.review_count, 0)::bigint AS review_count,
          act.last_activity
        FROM all_actors aa
        LEFT JOIN pr_counts pc ON pc.actor = aa.actor
        LEFT JOIN issue_counts ic ON ic.actor = aa.actor
        LEFT JOIN activity_stats act ON act.actor = aa.actor
        LEFT JOIN eip_counts ec ON ec.actor = aa.actor
        WHERE COALESCE(ec.eip_count, 0) > 0 
           OR COALESCE(pc.pr_count, 0) > 0 
           OR COALESCE(ic.issue_count, 0) > 0 
           OR COALESCE(act.review_count, 0) > 0
        ORDER BY (
          COALESCE(ec.eip_count, 0) +
          COALESCE(pc.pr_count, 0) +
          COALESCE(ic.issue_count, 0) +
          COALESCE(act.review_count, 0)
        ) DESC, aa.actor ASC
        LIMIT $2
      `, searchTerm, input.limit);

      return results.map(r => ({
        kind: 'author' as const,
        name: r.actor,
        role: r.role || null,
        eipCount: Number(r.eip_count),
        prCount: Number(r.pr_count),
        issueCount: Number(r.issue_count),
        reviewCount: Number(r.review_count),
        lastActivity: r.last_activity?.toISOString() || null,
      }));
    }),

  // Search pull requests
  searchPRs: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {
const searchTerm = `%${input.query}%`;
      const numericQuery = input.query.replace(/[^\d]/g, '');

      const results = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        repo: string;
        title: string | null;
        author: string | null;
        state: string | null;
        merged_at: Date | null;
        created_at: Date | null;
        updated_at: Date | null;
        labels: string[];
        governance_state: string | null;
      }>>(`
        SELECT
          p.pr_number,
          r.name AS repo,
          p.title,
          p.author,
          p.state,
          p.merged_at,
          p.created_at,
          p.updated_at,
          COALESCE(p.labels, ARRAY[]::text[]) AS labels,
          gs.current_state AS governance_state
        FROM pull_requests p
        JOIN repositories r ON r.id = p.repository_id
        LEFT JOIN pr_governance_state gs ON gs.pr_number = p.pr_number AND gs.repository_id = p.repository_id
        WHERE 
          p.pr_number::text ILIKE $1
          OR p.title ILIKE $1
          OR p.author ILIKE $1
          OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(p.labels, ARRAY[]::text[])) AS label
            WHERE label ILIKE $1
          )
        ORDER BY p.created_at DESC
        LIMIT $2
      `, searchTerm, input.limit);

      return results.map(r => ({
        kind: 'pr' as const,
        prNumber: r.pr_number,
        repo: r.repo,
        title: r.title || null,
        author: r.author || null,
        state: r.state || null,
        mergedAt: r.merged_at?.toISOString() || null,
        createdAt: r.created_at?.toISOString() || null,
        updatedAt: r.updated_at?.toISOString() || null,
        labels: r.labels || [],
        governanceState: r.governance_state || null,
      }));
    }),

  // Search issues
  searchIssues: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {
const searchTerm = `%${input.query}%`;
      const numericQuery = input.query.replace(/[^\d]/g, '');

      const results = await prisma.$queryRawUnsafe<Array<{
        issue_number: number;
        repo: string;
        title: string | null;
        author: string | null;
        state: string | null;
        created_at: Date | null;
        updated_at: Date | null;
        closed_at: Date | null;
        labels: string[];
      }>>(`
        SELECT
          i.issue_number,
          r.name AS repo,
          i.title,
          i.author,
          i.state,
          i.created_at,
          i.updated_at,
          i.closed_at,
          COALESCE(i.labels, ARRAY[]::text[]) AS labels
        FROM issues i
        JOIN repositories r ON r.id = i.repository_id
        WHERE 
          i.issue_number::text ILIKE $1
          OR i.title ILIKE $1
          OR i.author ILIKE $1
          OR EXISTS (
            SELECT 1 FROM unnest(COALESCE(i.labels, ARRAY[]::text[])) AS label
            WHERE label ILIKE $1
          )
        ORDER BY i.created_at DESC
        LIMIT $2
      `, searchTerm, input.limit);

      return results.map(r => ({
        kind: 'issue' as const,
        issueNumber: r.issue_number,
        repo: r.repo,
        title: r.title || null,
        author: r.author || null,
        state: r.state || null,
        createdAt: r.created_at?.toISOString() || null,
        updatedAt: r.updated_at?.toISOString() || null,
        closedAt: r.closed_at?.toISOString() || null,
        labels: r.labels || [],
      }));
    }),
}

