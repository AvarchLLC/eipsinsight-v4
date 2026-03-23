import { optionalAuthProcedure, type Ctx, ORPCError } from './types'
import { prisma } from '@/lib/prisma'
import { env } from '@/env'
import * as z from 'zod'

type SiteGuide = {
  title: string
  url: string
  summary: string
  keywords: string[]
}

type AssistantTurn = {
  role: 'user' | 'assistant'
  content: string
}

type ProposalRow = {
  eip_number: number
  title: string | null
  status: string
  type: string | null
  category: string | null
  author: string | null
  repo: string
}

const KNOWN_STANDARD_SUMMARIES: Record<string, string> = {
  'ERC-20': 'ERC-20 defines a standard interface for fungible tokens on Ethereum, including balances, transfers, approvals, and allowances so wallets, exchanges, and apps can interoperate.',
  'ERC-721': 'ERC-721 defines non-fungible tokens (NFTs), where each token ID is unique and ownership can be transferred and tracked on-chain.',
  'ERC-1155': 'ERC-1155 is a multi-token standard that supports fungible and non-fungible tokens in one contract, improving efficiency for batch operations.',
  'EIP-1559': 'EIP-1559 introduced a base fee that is burned and a priority fee for validators, making transaction fee pricing more predictable.',
  'EIP-4337': 'EIP-4337 enables account abstraction via smart contract wallets and UserOperations, allowing flexible signing, recovery, and gas sponsorship flows.',
  'EIP-4844': 'EIP-4844 adds blob-carrying transactions to lower L2 data costs and serve as a key step toward full danksharding.',
}

const SITE_GUIDES: SiteGuide[] = [
  {
    title: 'Standards Explorer',
    url: '/standards',
    summary: 'Use Standards Explorer to browse EIPs, ERCs, and RIPs by status, type, and category.',
    keywords: ['standard', 'standards', 'eip', 'erc', 'rip', 'proposal', 'proposals'],
  },
  {
    title: 'Search',
    url: '/search',
    summary: 'Search helps you find proposals, pull requests, issues, and contributors from one query.',
    keywords: ['search', 'find', 'lookup', 'look up', 'query'],
  },
  {
    title: 'Analytics Hub',
    url: '/analytics',
    summary: 'Analytics provides repository activity and contributor insights for protocol governance work.',
    keywords: ['analytics', 'metrics', 'stats', 'insights', 'data'],
  },
  {
    title: 'Insights',
    url: '/insights',
    summary: 'Insights contains narrative analysis on governance, editorial signals, and timeline patterns.',
    keywords: ['insight', 'commentary', 'governance', 'timeline', 'analysis'],
  },
  {
    title: 'Network Upgrades',
    url: '/upgrade',
    summary: 'Upgrade pages track Ethereum network upgrade context, milestones, and related standards.',
    keywords: ['upgrade', 'pectra', 'fusaka', 'hegota', 'glamsterdam', 'fork'],
  },
  {
    title: 'Resources',
    url: '/resources',
    summary: 'Resources includes FAQs, blogs, videos, documentation links, and ecosystem news.',
    keywords: ['resource', 'faq', 'blog', 'video', 'docs', 'documentation', 'news'],
  },
  {
    title: 'Tools',
    url: '/tools',
    summary: 'Tools include builders, board views, dependency graphs, and proposal timelines.',
    keywords: ['tool', 'builder', 'board', 'dependency', 'timeline'],
  },
]

function splitTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1)
}

function scoreGuide(query: string, guide: SiteGuide): number {
  const normalized = query.toLowerCase()
  const terms = splitTerms(query)
  let score = 0

  for (const keyword of guide.keywords) {
    const key = keyword.toLowerCase()
    if (normalized.includes(key)) score += key.includes(' ') ? 5 : 4
    if (terms.some((term) => key.includes(term) || term.includes(key))) score += 2
  }

  return score
}

function buildEffectiveQuery(query: string, history: AssistantTurn[]): string {
  const normalized = query.trim()
  const meaningful = normalized.split(/\s+/).filter(Boolean).length >= 3 || /\d/.test(normalized)
  if (meaningful || history.length === 0) return normalized

  const priorUser = [...history]
    .reverse()
    .find((turn) => turn.role === 'user' && turn.content.trim().toLowerCase() !== normalized.toLowerCase())

  if (!priorUser) return normalized
  return `${priorUser.content.trim()} ${normalized}`.slice(0, 400)
}

function parseProposalReference(query: string): { repo: 'eip' | 'erc' | 'rip' | null; number: number | null } {
  const tagged = query.match(/\b(eip|erc|rip)[\s\-:#]*(\d{1,6})\b/i)
  if (tagged) {
    const repo = tagged[1].toLowerCase() as 'eip' | 'erc' | 'rip'
    return { repo, number: Number.parseInt(tagged[2], 10) }
  }

  const numberOnly = query.match(/\b(\d{2,6})\b/)
  if (numberOnly && /\beip\b|\berc\b|\brip\b/i.test(query)) {
    return { repo: null, number: Number.parseInt(numberOnly[1], 10) }
  }

  return { repo: null, number: null }
}

function repoNameFilter(repo: 'eip' | 'erc' | 'rip' | null): string | null {
  if (repo === 'eip') return '%eip%'
  if (repo === 'erc') return '%erc%'
  if (repo === 'rip') return '%rip%'
  return null
}

function inferPrefix(row: ProposalRow, preferredRepo: 'eip' | 'erc' | 'rip' | null): 'EIP' | 'ERC' | 'RIP' {
  if (preferredRepo === 'erc') return 'ERC'
  if (preferredRepo === 'rip') return 'RIP'
  if (preferredRepo === 'eip') return 'EIP'

  if ((row.category || '').toLowerCase() === 'erc') return 'ERC'
  return getRepoPrefix(row.repo)
}

function scoreProposalMatch(row: ProposalRow, query: string, reference: { repo: 'eip' | 'erc' | 'rip' | null; number: number | null }): number {
  const normalized = query.toLowerCase()
  const title = (row.title || '').toLowerCase()
  const author = (row.author || '').toLowerCase()
  const status = row.status.toLowerCase()
  const category = (row.category || '').toLowerCase()
  const type = (row.type || '').toLowerCase()
  const numberText = String(row.eip_number)

  let score = 0
  if (reference.number && row.eip_number === reference.number) score += 5000
  if (reference.number && numberText.startsWith(String(reference.number))) score += 1200

  if (reference.repo === 'erc' && (category === 'erc' || title.includes('erc-'))) score += 400
  if (reference.repo === 'rip' && (category === 'rip' || title.includes('rip-'))) score += 400

  if (title.includes(normalized)) score += 250
  if (author.includes(normalized)) score += 120
  if (status.includes(normalized)) score += 60
  if (type.includes(normalized) || category.includes(normalized)) score += 50

  return score
}

function formatProposalSummary(row: ProposalRow, preferredRepo: 'eip' | 'erc' | 'rip' | null): string {
  const prefix = inferPrefix(row, preferredRepo)
  const canonicalKey = `${prefix}-${row.eip_number}`
  const canonical = KNOWN_STANDARD_SUMMARIES[canonicalKey]
  if (canonical) {
    return `${canonical} Current status: ${row.status}.`
  }

  const title = row.title ? `"${row.title}"` : 'a proposal'
  const typeText = row.type ? ` Type: ${row.type}.` : ''
  const categoryText = row.category ? ` Category: ${row.category}.` : ''
  const authorText = row.author ? ` Author: ${row.author}.` : ''

  return `${prefix}-${row.eip_number} is ${title}. Status: ${row.status}.${typeText}${categoryText}${authorText}`.trim()
}

async function refineAnswerWithCohere(input: {
  question: string
  baseAnswer: string
  exactProposal: ProposalRow | null
  topMatches: ProposalRow[]
  topGuides: SiteGuide[]
}): Promise<string | null> {
  if (!env.COHERE_API_KEY) return null

  const facts = {
    baseAnswer: input.baseAnswer,
    exactProposal: input.exactProposal
      ? {
          number: input.exactProposal.eip_number,
          repo: getRepoPrefix(input.exactProposal.repo),
          title: input.exactProposal.title,
          status: input.exactProposal.status,
          type: input.exactProposal.type,
          category: input.exactProposal.category,
          author: input.exactProposal.author,
        }
      : null,
    topMatches: input.topMatches.map((m) => ({
      number: m.eip_number,
      repo: getRepoPrefix(m.repo),
      title: m.title,
      status: m.status,
      type: m.type,
      category: m.category,
      author: m.author,
    })),
    topGuides: input.topGuides.map((g) => ({ title: g.title, summary: g.summary })),
  }

  try {
    const response = await fetch('https://api.cohere.ai/v1/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command-r-08-2024',
        temperature: 0.1,
        message: `You are a precise assistant for an Ethereum standards website.
Answer the user question in 1-2 short sentences (max 55 words).
Use only the provided facts. If facts are insufficient, say so briefly.
Do not mention links or navigation.

User question: ${input.question}
Facts: ${JSON.stringify(facts)}`,
      }),
    })

    const data = (await response.json()) as { text?: string }
    const text = data.text?.trim()
    if (!response.ok || !text) return null
    return text.replace(/\s+/g, ' ').slice(0, 420)
  } catch {
    return null
  }
}

function getRepoPrefix(repoName: string): 'EIP' | 'ERC' | 'RIP' {
  const lower = repoName.toLowerCase()
  if (lower.includes('erc')) return 'ERC'
  if (lower.includes('rip')) return 'RIP'
  return 'EIP'
}

function getRepoSegment(repoName: string): 'eip' | 'erc' | 'rip' {
  const lower = repoName.toLowerCase()
  if (lower.includes('erc')) return 'erc'
  if (lower.includes('rip')) return 'rip'
  return 'eip'
}

function uniqueByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

export const searchProcedures = {
  // Search proposals (EIPs, ERCs, RIPs)
  searchProposals: optionalAuthProcedure
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
  searchAuthors: optionalAuthProcedure
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
  searchPRs: optionalAuthProcedure
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
  searchIssues: optionalAuthProcedure
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

  answerAndRecommend: optionalAuthProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(4),
      history: z
        .array(
          z.object({
            role: z.enum(['user', 'assistant']),
            content: z.string().min(1),
          })
        )
        .optional()
        .default([]),
    }))
    .handler(async ({ input }) => {
      const normalizedQuery = input.query.trim()
      const recentHistory = input.history.slice(-8)
      const effectiveQuery = buildEffectiveQuery(normalizedQuery, recentHistory)
      const searchTerm = `%${effectiveQuery}%`
      const proposalRef = parseProposalReference(effectiveQuery)

      const scoredGuides = SITE_GUIDES
        .map((guide) => ({ guide, score: scoreGuide(effectiveQuery, guide) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)

      const topGuides = scoredGuides.slice(0, input.limit).map((item) => item.guide)

      let exactProposal: ProposalRow | null = null
      if (proposalRef.number) {
        const repoFilter = repoNameFilter(proposalRef.repo)
        const exactRows = await prisma.$queryRawUnsafe<ProposalRow[]>(
          `
            SELECT
              e.eip_number,
              e.title,
              s.status,
              s.type,
              s.category,
              e.author,
              r.name AS repo
            FROM eips e
            JOIN eip_snapshots s ON s.eip_id = e.id
            JOIN repositories r ON r.id = s.repository_id
            WHERE e.eip_number = $1
            ORDER BY CASE WHEN $2::text IS NOT NULL AND LOWER(r.name) LIKE $2 THEN 0 ELSE 1 END
            LIMIT 1
          `,
          proposalRef.number,
          repoFilter
        )
        exactProposal = exactRows[0] ?? null
      }

      const rawProposalMatches = await prisma.$queryRawUnsafe<ProposalRow[]>(
        `
          SELECT
            e.eip_number,
            e.title,
            s.status,
            s.type,
            s.category,
            e.author,
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
          LIMIT 30
        `,
        searchTerm
      )

      const proposalMatches = rawProposalMatches
        .map((row) => ({ row, score: scoreProposalMatch(row, effectiveQuery, proposalRef) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          return a.row.eip_number - b.row.eip_number
        })
        .map((item) => item.row)
        .slice(0, 3)

      const proposalRecommendation = proposalMatches.map((item) => {
        const prefix = inferPrefix(item, proposalRef.repo)
        const segment = getRepoSegment(item.repo)
        return {
          title: `${prefix}-${item.eip_number}`,
          url: `/${segment}/${item.eip_number}`,
          reason: item.title
            ? `${item.title} (${item.status})`
            : `Proposal status: ${item.status}`,
        }
      })

      const guideRecommendations = topGuides.map((guide) => ({
        title: guide.title,
        url: guide.url,
        reason: guide.summary,
      }))

      const recommendations = uniqueByUrl([
        ...proposalRecommendation,
        ...guideRecommendations,
        {
          title: 'Search',
          url: '/search',
          reason: 'Use Search to refine by proposals, PRs, issues, and people.',
        },
      ]).slice(0, input.limit)

      let answer = 'I do not have enough direct data to answer that precisely yet, but I matched the closest pages below.'

      if (exactProposal) {
        answer = formatProposalSummary(exactProposal, proposalRef.repo)
      } else if (proposalMatches.length > 0) {
        answer = formatProposalSummary(proposalMatches[0], proposalRef.repo)
      } else if (topGuides.length > 0) {
        answer = `${topGuides[0].summary} I can answer more precisely if you mention an EIP/ERC/RIP number.`
      }

      const llmAnswer = await refineAnswerWithCohere({
        question: normalizedQuery,
        baseAnswer: answer,
        exactProposal,
        topMatches: proposalMatches,
        topGuides,
      })

      if (llmAnswer) answer = llmAnswer

      const confidence = exactProposal
        ? 'high'
        : topGuides.length > 0 || proposalMatches.length > 0
        ? (topGuides.length > 0 && proposalMatches.length > 0 ? 'high' : 'medium')
        : 'low'

      return {
        answer,
        confidence,
        recommendations,
      }
    }),
}

