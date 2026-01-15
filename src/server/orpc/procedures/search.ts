import { os, checkAPIToken, type Ctx, ORPCError } from './types'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const searchProcedures = {
  // Search proposals (EIPs, ERCs, RIPs)
  searchProposals: os
    .$context<Ctx>()
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(50),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

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

  // Search authors (derived from eips.author)
  searchAuthors: os
    .$context<Ctx>()
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(20),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      const searchTerm = `%${input.query}%`;

      // Extract and aggregate authors
      const results = await prisma.$queryRawUnsafe<Array<{
        author_name: string;
        contributions: bigint;
      }>>(`
        WITH author_list AS (
          SELECT
            TRIM(unnest(string_to_array(author, ','))) AS author_name
          FROM eips
          WHERE author IS NOT NULL AND author != ''
        ),
        normalized_authors AS (
          SELECT
            CASE
              -- Extract GitHub handle from (@handle)
              WHEN author_name ~ '\\(@([\\w-]+)\\)' THEN 
                SUBSTRING(author_name FROM '\\(@([\\w-]+)\\)')
              -- Extract name before <email>
              WHEN author_name ~ '<' THEN 
                TRIM(SPLIT_PART(author_name, '<', 1))
              -- Use as-is
              ELSE TRIM(author_name)
            END AS normalized_name,
            author_name AS original_name
          FROM author_list
        )
        SELECT
          COALESCE(normalized_name, original_name) AS author_name,
          COUNT(*)::bigint AS contributions
        FROM normalized_authors
        WHERE normalized_name ILIKE $1 OR original_name ILIKE $1
        GROUP BY COALESCE(normalized_name, original_name)
        ORDER BY contributions DESC, author_name ASC
        LIMIT $2
      `, searchTerm, input.limit);

      return results.map(r => ({
        kind: 'author' as const,
        name: r.author_name,
        contributionCount: Number(r.contributions),
      }));
    }),

  // Search pull requests (secondary)
  searchPRs: os
    .$context<Ctx>()
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(20),
    }))
    .handler(async ({ context, input }) => {
      await checkAPIToken(context.headers);

      // Only search if query is numeric or starts with pr/#/pull
      const numericQuery = input.query.replace(/[^\d]/g, '');
      if (!numericQuery && !/^(pr|#|pull)/i.test(input.query)) {
        return [];
      }

      const searchTerm = numericQuery ? `%${numericQuery}%` : `%${input.query}%`;

      const results = await prisma.$queryRawUnsafe<Array<{
        pr_number: number;
        repo: string;
        title: string | null;
        state: string | null;
      }>>(`
        SELECT
          p.pr_number,
          r.name AS repo,
          p.title,
          p.state
        FROM pull_requests p
        JOIN repositories r ON r.id = p.repository_id
        WHERE 
          p.pr_number::text LIKE $1
          OR p.title ILIKE $1
        ORDER BY p.pr_number DESC
        LIMIT $2
      `, searchTerm, input.limit);

      return results.map(r => ({
        kind: 'pr' as const,
        prNumber: r.pr_number,
        repo: r.repo,
        title: r.title || null,
        state: r.state || null,
      }));
    }),
}
