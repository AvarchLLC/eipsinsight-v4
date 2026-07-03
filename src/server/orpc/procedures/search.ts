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

type AssistantDataQuery = {
  title: string
  description: string
  sql: string
  columns: string[]
  rows: Array<Record<string, string | number | boolean | null>>
  rowCount: number
}

const ANALYTICS_SQL_SCHEMA = `
== REPOSITORIES ==
repositories(id INT PK, name TEXT, type TEXT, active BOOL)
  - name examples: 'ethereum/EIPs', 'ethereum/ERCs', 'ethereum/RIPs'
  - Filter by repo: LOWER(SPLIT_PART(r.name, '/', 2)) IN ('eips','ercs','rips')
  - All other tables join to this via repository_id = repositories.id

== PROPOSALS ==
eips(id INT PK, eip_number INT, created_at TIMESTAMPTZ, title TEXT, author TEXT)
  - Covers EIPs and ERCs (both stored here). RIPs are separate (rips table — not queryable).
  - author is a comma-separated string of GitHub handles, e.g. '@vitalik,@ansgar'

eip_snapshots(eip_id INT FK→eips.id, repository_id INT FK→repositories.id, status TEXT, type TEXT, category TEXT, deadline TIMESTAMPTZ, updated_at TIMESTAMPTZ)
  - status values: 'Draft' | 'Review' | 'Last Call' | 'Final' | 'Living' | 'Stagnant' | 'Withdrawn'
  - type values: 'Standards Track' | 'Meta' | 'Informational'
  - category values: 'Core' | 'Networking' | 'Interface' | 'ERC' | 'RIP'
  - One row per eip per repository (use DISTINCT ON (eip_id) if joining multiple repos)

eip_status_events(eip_id INT FK→eips.id, repository_id INT, from_status TEXT, to_status TEXT, pr_number INT, changed_at TIMESTAMPTZ)
  - Each row is one status transition. Use to answer "when did X move to Final?"

== PULL REQUESTS ==
pull_requests(pr_number INT, repository_id INT, title TEXT, author TEXT, merged_at TIMESTAMPTZ, closed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, state TEXT, num_commits INT, num_files INT, num_participants INT, num_comments INT, num_reviews INT, labels TEXT[], created_at TIMESTAMPTZ)
  - state: 'open' | 'closed'  (merged PRs have state='closed' AND merged_at IS NOT NULL)
  - labels is a PostgreSQL TEXT ARRAY — filter with: labels @> ARRAY['c-status']  OR  EXISTS (SELECT 1 FROM unnest(labels) l WHERE l = 'c-status')
  - PK: (pr_number, repository_id)

pr_events(pr_number INT, repository_id INT, event_type TEXT, actor TEXT, actor_role TEXT, created_at TIMESTAMPTZ)
  - event_type values: 'commented' | 'issue_comment' | 'reviewed' | 'committed' | 'labeled' | 'unlabeled' | 'merged' | 'closed' | 'reopened'
  - actor_role values: 'EDITOR' | 'REVIEWER' | 'AUTHOR' | 'CONTRIBUTOR'

pr_governance_state(pr_number INT, repository_id INT, current_state TEXT, waiting_since TIMESTAMPTZ, last_actor TEXT, last_event_type TEXT, updated_at TIMESTAMPTZ, category TEXT, subcategory TEXT)
  - current_state values: 'WAITING_EDITOR' | 'WAITING_AUTHOR' | 'WAITING_COMMUNITY' | 'IDLE' | 'CLOSED' | 'DRAFT'
    (legacy aliases also in DB: 'WAITING_ON_EDITOR', 'WAITING_ON_AUTHOR' — always match both)
  - waiting_since: when the current state began; use NOW() - waiting_since to compute wait days
  - PK: (pr_number, repository_id)

pr_custom_tags(pr_number INT, repository_id INT, tag TEXT, created_at TIMESTAMPTZ)
  - tag values include: 'Status Change' | 'Typo' | 'New EIP' | 'Content Edit' | 'Website'

pr_reviews(pr_number INT, repository_id INT, reviewer TEXT, review_state TEXT, submitted_at TIMESTAMPTZ)
  - review_state values: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED'

pr_monthly_snapshot(repository_id INT, pr_number INT, month_year TEXT, state TEXT, governance_state TEXT, category TEXT, subcategory TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
  - month_year format: 'YYYY-MM' (e.g. '2025-03')
  - Use for historical monthly breakdowns of PR state

pr_monthly_board_stats(month_year TEXT, category TEXT, subcategory TEXT, count BIGINT)
  - Pre-aggregated counts per month/category; fastest for trend queries

pr_label_snapshot(repository_id INT, pr_number INT, month_year TEXT, labels TEXT[], created_at TIMESTAMPTZ)

== ISSUES ==
issues(issue_number INT, repository_id INT, title TEXT, author TEXT, state TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, closed_at TIMESTAMPTZ, labels TEXT[], num_comments INT)
  - state: 'open' | 'closed'

issue_events(issue_number INT, repository_id INT, event_type TEXT, actor TEXT, actor_role TEXT, created_at TIMESTAMPTZ)

== CONTRIBUTORS ==
contributor_activity(pr_number INT, repository_id INT, actor TEXT, role TEXT, action_type TEXT, occurred_at TIMESTAMPTZ)
  - action_type values: 'reviewed' | 'commented' | 'issue_comment' | 'merged' | 'opened'
  - role values: 'EDITOR' | 'REVIEWER' | 'AUTHOR' | 'CONTRIBUTOR'
  - Best table for "who did what" queries across all activity

contributor_scores(actor TEXT, repository_id INT, total_score NUMERIC, commits_count INT, prs_created INT, prs_merged INT, reviews_count INT, comments_count INT, first_activity TIMESTAMPTZ, last_activity TIMESTAMPTZ)
  - Pre-computed lifetime scores per actor. Fastest for leaderboard queries.
  - PK: (actor, repository_id)

== LINKING TABLES ==
pull_request_eips(pr_number INT, repository_id INT, eip_number INT, linked_at TIMESTAMPTZ)
  - Links PRs to the EIPs they touch

issue_eips(issue_number INT, repository_id INT, eip_number INT, linked_at TIMESTAMPTZ)

== OTHER ==
insights_monthly(month_year TEXT, summary TEXT, highlights JSONB, created_at TIMESTAMPTZ)

upgrades(id INT PK, slug TEXT, name TEXT, meta_eip INT, repo TEXT, file_path TEXT, created_at TIMESTAMPTZ)
  - Network upgrades (Pectra, Fusaka, etc.)

upgrade_composition_current(upgrade_id INT FK→upgrades.id, eip_number INT, bucket TEXT, updated_at TIMESTAMPTZ)
  - bucket values: 'Included' | 'Considered' | 'Declined'
`

const ASSISTANT_WORKFLOW_CONTEXT = `
== KEY DOMAIN CONVENTIONS ==

Repos:
- EIPs and ERCs share the eips + eip_snapshots tables; distinguish by LOWER(SPLIT_PART(r.name,'/',2))
- To filter by repo type: LOWER(SPLIT_PART(r.name, '/', 2)) = 'eips' | 'ercs' | 'rips'

PR state:
- Open PRs: pull_requests.state = 'open'
- Merged PRs: pull_requests.state = 'closed' AND merged_at IS NOT NULL
- Closed/rejected: pull_requests.state = 'closed' AND merged_at IS NULL

Governance waiting states (always match both spellings):
- Waiting on editor: current_state IN ('WAITING_EDITOR', 'WAITING_ON_EDITOR')
- Waiting on author: current_state IN ('WAITING_AUTHOR', 'WAITING_ON_AUTHOR')

Status-change PR detection (use all three signals with OR):
  1) EXISTS (SELECT 1 FROM pr_custom_tags pct WHERE pct.pr_number=pr.pr_number AND pct.repository_id=pr.repository_id AND LOWER(pct.tag)='status change')
  2) pgs.category = 'Status Change'
  3) pr.labels @> ARRAY['c-status'] OR pr.labels @> ARRAY['c-update']

Editor identification:
- pr_events.actor_role = 'EDITOR'
- contributor_activity.role = 'EDITOR'
- For leaderboard: contributor_scores (pre-aggregated, fast)
- To identify which editor merged (or approved) a specific EIP:
  Since merges are often automated by bots (like 'eth-bot'), look for the editor who approved the pull request linked to that EIP.
  To find approvals: join pull_request_eips to pull_requests and left join to pr_reviews (where review_state = 'approved') and pr_events (where event_type = 'reviewed' and metadata->>'review_state' = 'approved') and ensure the reviewer/actor is an editor (role = 'EDITOR' or actor_role = 'EDITOR').

Timestamps:
- All timestamps are TIMESTAMPTZ (UTC)
- month_year columns use 'YYYY-MM' string format — use TO_CHAR(ts, 'YYYY-MM') to group by month
- Wait duration: EXTRACT(DAY FROM (NOW() - waiting_since))::int

Array columns:
- pull_requests.labels and issues.labels are TEXT[] — use @> for contains, unnest() for iteration
- Example: labels @> ARRAY['c-status']::text[]
`

const ALLOWED_ANALYTICS_TABLES = new Set([
  'eips',
  'eip_snapshots',
  'eip_status_events',
  'pull_requests',
  'pr_events',
  'pr_governance_state',
  'pr_custom_tags',
  'pr_reviews',
  'pr_monthly_snapshot',
  'pr_monthly_board_stats',
  'pr_label_snapshot',
  'issues',
  'issue_events',
  'repositories',
  'contributor_activity',
  'contributor_scores',
  'pull_request_eips',
  'issue_eips',
  'insights_monthly',
  'upgrades',
  'upgrade_composition_current',
])

const SQL_BLOCKLIST =
  /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|comment|copy|vacuum|analyze|refresh|execute|call|do)\b/i

const ANALYTICS_INTENT_HINT =
  /\b(how many|count|top|trend|over time|last|month|year|compare|breakdown|distribution|waiting|review|pull request|prs?|issues?|status|editor|author|repo|repository|governance|activity|sql|query)\b/i

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
  if (!env.GROQ_API_KEY && !env.COHERE_API_KEY) return null

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

  const systemMsg = `You are a precise assistant for an Ethereum standards website.
Answer the user question in 1-2 short sentences (max 55 words).
Use only the provided facts. If facts are insufficient, say so briefly.
Do not mention links or navigation.`
  const userMsg = `User question: ${input.question}\nFacts: ${JSON.stringify(facts)}`

  if (env.GROQ_API_KEY) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg },
          ],
        }),
      })
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
      const text = data.choices?.[0]?.message?.content?.trim()
      if (response.ok && text) return text.replace(/\s+/g, ' ').slice(0, 420)
    } catch {
      // fall through to Cohere
    }
  }

  if (env.COHERE_API_KEY) {
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
          message: `${systemMsg}\n\n${userMsg}`,
        }),
      })
      const data = (await response.json()) as { text?: string }
      const text = data.text?.trim()
      if (response.ok && text) return text.replace(/\s+/g, ' ').slice(0, 420)
    } catch {
      return null
    }
  }

  return null
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

function isAnalyticsQuestion(query: string): boolean {
  return ANALYTICS_INTENT_HINT.test(query.toLowerCase())
}

function isWorkflowContextQuestion(query: string): boolean {
  const q = query.toLowerCase()
  return (
    /how.*(collect|ingest|compute|derive)/.test(q) ||
    /(data|pipeline|workflow|scheduler).*(work|flow|logic)/.test(q) ||
    /(which|what).*(table|tables|source|sources)/.test(q)
  )
}

function workflowContextSummary(): string {
  return [
    'Data pipeline summary:',
    '1) Scheduler ingests commits, PR timelines, issues, and upgrades from ethereum/EIPs, ERCs, and RIPs.',
    '2) PR state is derived into pr_governance_state (WAITING_ON_EDITOR/WAITING_ON_AUTHOR/DRAFT/MERGED/CLOSED).',
    '3) Status-change PRs are detected from pr_custom_tags, governance category, and labels like c-status/c-update.',
    '4) ORPC procedures read these tables through /rpc (analytics, standards, insights, governance, tools, search).',
  ].join(' ')
}

function normalizeSqlText(text: string): string {
  return text
    .replace(/```sql/gi, '```')
    .replace(/```/g, '')
    .trim()
}

function stripSqlComments(sql: string): string {
  // Strip -- single-line comments and /* */ block comments before structural checks
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
}

function extractJsonObject(text: string): string | null {
  const normalized = normalizeSqlText(text)
  const start = normalized.indexOf('{')
  const end = normalized.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return normalized.slice(start, end + 1)
}

function extractCteNames(sql: string): Set<string> {
  // Matches: WITH name AS ( and , name AS (
  const found = new Set<string>()
  const regex = /\b(?:with|,)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s*\(/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(sql)) !== null) {
    found.add(match[1].toLowerCase())
  }
  return found
}

function extractReferencedTables(sql: string): string[] {
  // Parenthesis-depth-aware extraction — FROM inside EXTRACT(...FROM...) is a
  // SQL keyword argument, not a table reference, so we skip depth > 0.
  const found = new Set<string>()
  let depth = 0
  let i = 0

  while (i < sql.length) {
    // Skip single-quoted string literals
    if (sql[i] === "'") {
      i++
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i - 1] !== '\\') { i++; break }
        i++
      }
      continue
    }

    if (sql[i] === '(') { depth++; i++; continue }
    if (sql[i] === ')') { depth--; i++; continue }

    // Only match FROM/JOIN table references at the top-level clause (depth 0)
    if (depth === 0) {
      const slice = sql.slice(i)
      const m = slice.match(/^(from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i)
      if (m && (i === 0 || /\W/.test(sql[i - 1]))) {
        found.add(m[2].toLowerCase())
        i += m[0].length
        continue
      }
    }

    i++
  }

  return [...found]
}

function enforceSelectOnlySql(sql: string): string | null {
  const cleaned = normalizeSqlText(sql).replace(/;+\s*$/g, '')
  if (!cleaned) return null
  if (cleaned.length > 6000) return null

  // Strip comments before structural and blocklist checks to avoid false positives
  const stripped = stripSqlComments(cleaned)
  if (!stripped) return null
  if (!/^\s*(select|with)\b/i.test(stripped)) return null
  if (SQL_BLOCKLIST.test(stripped)) return null

  // CTE-aware table validation: exclude CTE names from the allowlist check
  const cteNames = extractCteNames(stripped)
  const tables = extractReferencedTables(stripped)
  if (tables.length === 0) return null
  for (const table of tables) {
    if (!cteNames.has(table) && !ALLOWED_ANALYTICS_TABLES.has(table)) {
      return null
    }
  }

  const limitMatch = cleaned.match(/\blimit\s+(\d+)\b/i)
  if (!limitMatch) {
    return `${cleaned}\nLIMIT 100`
  }

  const parsed = Number.parseInt(limitMatch[1], 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  if (parsed <= 200) return cleaned
  return cleaned.replace(/\blimit\s+\d+\b/i, 'LIMIT 200')
}

function normalizeCellValue(value: unknown): string | number | boolean | null {
  if (value == null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return JSON.stringify(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

async function generateAnalyticsSql(input: {
  question: string
  history: AssistantTurn[]
}): Promise<{ sql: string; title: string; description: string } | null> {
  if (!env.GROQ_API_KEY && !env.COHERE_API_KEY) return null

  const prior = input.history
    .slice(-8)
    .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
    .join('\n')

  const systemPrompt = `You are a PostgreSQL analytics query planner for EIPsInsight, an Ethereum Improvement Proposal observability platform.
Generate one SAFE read-only SQL query and short metadata for the user's question.

== RULES ==
- Output JSON only. No markdown, no explanation, no code fences.
- Use only SELECT or WITH...SELECT. Never INSERT/UPDATE/DELETE/DROP/ALTER.
- Only reference tables listed in the schema below. No invented table names.
- Always include LIMIT <= 100 unless the query is an aggregate that naturally returns few rows.
- Use COALESCE to handle NULLs in join columns.
- Prefer explicit column aliases for clarity.
- When filtering labels (TEXT[]), use: labels @> ARRAY['label']::text[]
- For "merged PRs": state = 'closed' AND merged_at IS NOT NULL
- Always match both spellings of governance states: WAITING_EDITOR and WAITING_ON_EDITOR

== DOMAIN CONTEXT ==
${ASSISTANT_WORKFLOW_CONTEXT}

== SCHEMA ==
${ANALYTICS_SQL_SCHEMA}

== RETURN SHAPE (JSON only) ==
{"title":"short title","description":"one sentence description","sql":"SELECT ..."}

== EXAMPLES ==

Q: Who are the top 10 editors by number of PRs reviewed this year?
A: {"title":"Top editors by reviews (this year)","description":"Editors ranked by review count in the current calendar year.","sql":"SELECT ca.actor, COUNT(*) AS review_count FROM contributor_activity ca JOIN repositories r ON r.id = ca.repository_id WHERE ca.action_type = 'reviewed' AND ca.role = 'EDITOR' AND EXTRACT(YEAR FROM ca.occurred_at) = EXTRACT(YEAR FROM NOW()) GROUP BY ca.actor ORDER BY review_count DESC LIMIT 10"}

Q: How many EIPs reached Final status each year?
A: {"title":"EIPs reaching Final status by year","description":"Count of proposals that transitioned to Final status, grouped by year.","sql":"SELECT EXTRACT(YEAR FROM ese.changed_at)::int AS year, COUNT(DISTINCT ese.eip_id) AS finalized FROM eip_status_events ese WHERE ese.to_status = 'Final' GROUP BY year ORDER BY year DESC LIMIT 20"}

Q: Show open PRs waiting on editor review for more than 30 days
A: {"title":"Open PRs waiting on editor 30+ days","description":"Pull requests in WAITING_EDITOR state for over 30 days, ordered by wait time.","sql":"SELECT pr.pr_number, r.name AS repo, pr.title, pr.author, EXTRACT(DAY FROM (NOW() - pgs.waiting_since))::int AS waiting_days FROM pr_governance_state pgs JOIN pull_requests pr ON pr.pr_number = pgs.pr_number AND pr.repository_id = pgs.repository_id JOIN repositories r ON r.id = pr.repository_id WHERE pgs.current_state IN ('WAITING_EDITOR','WAITING_ON_EDITOR') AND pr.state = 'open' AND pgs.waiting_since < NOW() - INTERVAL '30 days' ORDER BY waiting_days DESC LIMIT 50"}

Q: Which editor merged EIP-7212?
A: {"title":"Merging editor for EIP-7212","description":"Finds the editor who approved or merged the PR associated with EIP-7212.","sql":"SELECT DISTINCT COALESCE(pr.reviewer, pe.actor) AS editor FROM pull_request_eips pre JOIN pull_requests p ON p.pr_number = pre.pr_number AND p.repository_id = pre.repository_id LEFT JOIN pr_reviews pr ON pr.pr_number = p.pr_number AND pr.repository_id = p.repository_id AND LOWER(pr.review_state) = 'approved' AND pr.reviewer IN (SELECT DISTINCT actor FROM contributor_activity WHERE role = 'EDITOR') LEFT JOIN pr_events pe ON pe.pr_number = p.pr_number AND pe.repository_id = p.repository_id AND pe.actor_role = 'EDITOR' AND pe.event_type = 'reviewed' AND LOWER(pe.metadata->>'review_state') = 'approved' WHERE pre.eip_number = 7212 AND p.merged_at IS NOT NULL AND (pr.reviewer IS NOT NULL OR pe.actor IS NOT NULL)"}

${prior ? `== CONVERSATION CONTEXT ==\n${prior}\n\n` : ''}Now answer the user's question with the JSON return shape only.`

  const parseResult = (text: string) => {
    const jsonText = extractJsonObject(text)
    if (!jsonText) return null
    try {
      const parsed = JSON.parse(jsonText) as { sql?: string; title?: string; description?: string }
      if (!parsed.sql) return null
      const safeSql = enforceSelectOnlySql(parsed.sql)
      if (!safeSql) return null
      return {
        sql: safeSql,
        title: parsed.title?.trim() || 'Custom analysis',
        description: parsed.description?.trim() || 'Generated from your question.',
      }
    } catch {
      return null
    }
  }

  if (env.GROQ_API_KEY) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input.question },
          ],
        }),
      })
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
      if (!response.ok) {
        console.error('[assistant/sql] Groq error:', response.status, data.error?.message)
      } else if (data.choices?.[0]?.message?.content) {
        const raw = data.choices[0].message.content
        const result = parseResult(raw)
        if (result) return result
        console.error('[assistant/sql] Groq SQL rejected by validator. Raw output:', raw.slice(0, 400))
      }
    } catch (err) {
      console.error('[assistant/sql] Groq fetch failed:', err)
    }
  }

  if (env.COHERE_API_KEY) {
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
          message: `${systemPrompt}\n\nUser question:\n${input.question}`,
        }),
      })
      const data = (await response.json()) as { text?: string }
      if (response.ok && data.text) return parseResult(data.text)
    } catch {
      return null
    }
  }

  return null
}

async function runAnalyticsQuery(input: {
  question: string
  history: AssistantTurn[]
}): Promise<AssistantDataQuery | null> {
  const planned = await generateAnalyticsSql(input)
  if (!planned) return null

  try {
    const rawRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(planned.sql)
    const safeRows = rawRows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, normalizeCellValue(value)])
      ) as Record<string, string | number | boolean | null>
    )
    const columns = safeRows.length > 0 ? Object.keys(safeRows[0]) : []

    return {
      title: planned.title,
      description: planned.description,
      sql: planned.sql,
      columns,
      rows: safeRows,
      rowCount: safeRows.length,
    }
  } catch {
    return null
  }
}

function summarizeDataQueryResult(query: AssistantDataQuery): string {
  if (query.rowCount === 0) {
    return `${query.title}: no matching rows found for this filter scope.`
  }

  const first = query.rows[0] ?? {}
  const topPairs = Object.entries(first)
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v ?? 'null'}`)
    .join(', ')

  return `${query.title}: returned ${query.rowCount} row${query.rowCount === 1 ? '' : 's'}. Top row snapshot -> ${topPairs}.`
}

function detectRepoScopeFromQuestion(query: string): 'eips' | 'ercs' | 'rips' | null {
  const q = query.toLowerCase()
  if (/\berc\b|\berc[s]?\b/.test(q)) return 'ercs'
  if (/\brip\b|\brip[s]?\b/.test(q)) return 'rips'
  if (/\beip\b|\beip[s]?\b/.test(q)) return 'eips'
  return null
}

async function runDeterministicAnalyticsQuery(question: string): Promise<AssistantDataQuery | null> {
  const q = question.toLowerCase()
  
  // Pattern 1: Who merged/approved EIP-XXXX?
  const asksWhoMerged = /\b(who|which editor|which editors)\b.*\b(merge|merged|approve|approved)\b/i.test(q)
  const proposalRef = parseProposalReference(question)
  
  if (asksWhoMerged && proposalRef.number) {
    const sql = `
      SELECT DISTINCT COALESCE(pr.reviewer, pe.actor) AS editor
      FROM pull_request_eips pre
      JOIN pull_requests p 
        ON p.pr_number = pre.pr_number 
        AND p.repository_id = pre.repository_id
      LEFT JOIN pr_reviews pr 
        ON pr.pr_number = p.pr_number 
        AND pr.repository_id = p.repository_id 
        AND LOWER(pr.review_state) = 'approved' 
        AND pr.reviewer IN (SELECT DISTINCT actor FROM contributor_activity WHERE role = 'EDITOR')
      LEFT JOIN pr_events pe 
        ON pe.pr_number = p.pr_number 
        AND pe.repository_id = p.repository_id 
        AND pe.actor_role = 'EDITOR' 
        AND pe.event_type = 'reviewed' 
        AND LOWER(pe.metadata->>'review_state') = 'approved'
      WHERE pre.eip_number = $1 
        AND p.merged_at IS NOT NULL 
        AND (pr.reviewer IS NOT NULL OR pe.actor IS NOT NULL)
      LIMIT 100
    `
    try {
      const rawRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(sql, proposalRef.number)
      const safeRows = rawRows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [key, normalizeCellValue(value)])
        ) as Record<string, string | number | boolean | null>
      )
      const columns = safeRows.length > 0 ? Object.keys(safeRows[0]) : []
      const prefix = proposalRef.repo ? proposalRef.repo.toUpperCase() : 'Proposal'
      
      return {
        title: `Merging editor for ${prefix}-${proposalRef.number}`,
        description: `The editor who approved or merged the PR associated with ${prefix}-${proposalRef.number}.`,
        sql,
        columns,
        rows: safeRows,
        rowCount: safeRows.length,
      }
    } catch {
      // Fall through to other handlers if query fails
    }
  }

  const asksWaitingEditor =
    /(waiting|awaiting).*(editor|review)/.test(q) || /(editor|review).*(waiting|awaiting)/.test(q)
  const statusChangeOnly =
    /\bstatus\s*change\b/.test(q) ||
    /\bstatus\b.*\b(change|update)\b/.test(q) ||
    /\bc-status\b/.test(q) ||
    /\bc-update\b/.test(q)

  if (!asksWaitingEditor) return null

  const repoScope = detectRepoScopeFromQuestion(question)
  const sql = `
    SELECT
      pr.pr_number,
      r.name AS repo,
      COALESCE(
        STRING_AGG(DISTINCT ('EIP-' || pre.eip_number::text), ', '),
        '—'
      ) AS linked_proposals,
      pr.title,
      pr.author,
      TO_CHAR(pr.created_at, 'YYYY-MM-DD') AS created_at,
      pgs.current_state AS governance_state,
      CASE
        WHEN pgs.waiting_since IS NULL THEN NULL
        ELSE GREATEST(0, EXTRACT(DAY FROM (NOW() - pgs.waiting_since))::int)
      END AS waiting_days
    FROM pr_governance_state pgs
    JOIN pull_requests pr
      ON pr.pr_number = pgs.pr_number
      AND pr.repository_id = pgs.repository_id
    JOIN repositories r ON r.id = pr.repository_id
    LEFT JOIN pull_request_eips pre
      ON pre.pr_number = pr.pr_number
      AND pre.repository_id = pr.repository_id
    WHERE pgs.current_state IN ('WAITING_ON_EDITOR', 'WAITING_EDITOR')
      AND COALESCE(pr.state, '') = 'open'
      AND (
        $2::boolean IS NOT TRUE
        OR COALESCE(pr.labels, ARRAY[]::text[]) && ARRAY['c-status', 'c-update']::text[]
        OR COALESCE(pgs.category, '') = 'Status Change'
        OR EXISTS (
          SELECT 1
          FROM pr_custom_tags pct
          WHERE pct.pr_number = pr.pr_number
            AND pct.repository_id = pr.repository_id
            AND LOWER(pct.tag) = 'status change'
        )
      )
      AND (
        $1::text IS NULL
        OR LOWER(SPLIT_PART(r.name, '/', 2)) = LOWER($1)
      )
    GROUP BY
      pr.pr_number, r.name, pr.title, pr.author, pr.created_at, pgs.current_state, pgs.waiting_since
    ORDER BY
      waiting_days DESC NULLS LAST,
      pr.created_at ASC
    LIMIT 100
  `

  try {
    const rawRows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(sql, repoScope, statusChangeOnly)
    const safeRows = rawRows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, normalizeCellValue(value)])
      ) as Record<string, string | number | boolean | null>
    )
    const columns = safeRows.length > 0 ? Object.keys(safeRows[0]) : []

    const scopeTitle =
      repoScope === 'eips' ? 'EIP proposals' : repoScope === 'ercs' ? 'ERC proposals' : repoScope === 'rips' ? 'RIP proposals' : 'Proposals'

    return {
      title: `${scopeTitle} waiting on editor review${statusChangeOnly ? ' (status change)' : ''}`,
      description: statusChangeOnly
        ? 'Open PRs waiting on editor action and tagged as status-change work.'
        : 'Open PRs currently classified as waiting on editor action.',
      sql,
      columns,
      rows: safeRows,
      rowCount: safeRows.length,
    }
  } catch {
    return null
  }
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
      const normalizedQuery = input.query.trim().toLowerCase();
      const hintedRepo =
        /\brips?\b/.test(normalizedQuery)
          ? '%rip%'
          : /\bercs?\b/.test(normalizedQuery)
            ? '%erc%'
            : /\beips?\b/.test(normalizedQuery)
              ? '%eip%'
              : null;

      // Get all matching proposals first (EIP/ERC snapshots + RIP table)
      const eipLikeResults = await prisma.$queryRawUnsafe<Array<{
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
          OR ($3::int IS NOT NULL AND e.eip_number = $3)
          OR ($4::text IS NOT NULL AND LOWER(r.name) LIKE LOWER($4))
        LIMIT $2
      `, searchTerm, input.limit * 2, exactNumber, hintedRepo); // Get more to score and filter
      const ripResults = await prisma.$queryRawUnsafe<Array<{
        eip_number: number;
        title: string | null;
        author: string | null;
        status: string;
        type: string | null;
        category: string | null;
        repo: string;
      }>>(`
        SELECT
          rp.rip_number AS eip_number,
          rp.title,
          rp.author,
          COALESCE(rp.status, 'Unknown') AS status,
          'RIP'::text AS type,
          'RIP'::text AS category,
          'ethereum/RIPs'::text AS repo
        FROM rips rp
        WHERE
          rp.rip_number::text ILIKE $1
          OR COALESCE(rp.title, '') ILIKE $1
          OR COALESCE(rp.author, '') ILIKE $1
          OR COALESCE(rp.status, '') ILIKE $1
          OR ($3::int IS NOT NULL AND rp.rip_number = $3)
          OR ($4::text IS NOT NULL AND LOWER('ethereum/RIPs') LIKE LOWER($4))
        LIMIT $2
      `, searchTerm, input.limit * 2, exactNumber, hintedRepo);

      const allResults = [...eipLikeResults, ...ripResults];

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
      .filter(r => r.score > 0);

      const uniqueScoredResults = Array.from(
        new Map(
          scoredResults.map((row) => [`${row.repo}:${row.eip_number}`, row] as const)
        ).values()
      )
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.eip_number - b.eip_number;
      })
      .slice(0, input.limit);

      return uniqueScoredResults.map(r => ({
        kind: 'proposal' as const,
        number: r.eip_number,
        repo: r.repo.toLowerCase().includes('/eips') ? 'eip' : r.repo.toLowerCase().includes('/ercs') ? 'erc' : 'rip',
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
      let dataQuery: AssistantDataQuery | null = null

      if (isWorkflowContextQuestion(effectiveQuery)) {
        answer = workflowContextSummary()
      } else if (exactProposal) {
        answer = formatProposalSummary(exactProposal, proposalRef.repo)
      } else if (proposalMatches.length > 0) {
        answer = formatProposalSummary(proposalMatches[0], proposalRef.repo)
      } else if (topGuides.length > 0) {
        answer = `${topGuides[0].summary} I can answer more precisely if you mention an EIP/ERC/RIP number.`
      }

      if (isAnalyticsQuestion(effectiveQuery)) {
        dataQuery =
          (await runDeterministicAnalyticsQuery(normalizedQuery)) ||
          (await runAnalyticsQuery({
            question: normalizedQuery,
            history: recentHistory,
          }))

        if (dataQuery) {
          answer = summarizeDataQueryResult(dataQuery)
        } else if (!env.GROQ_API_KEY && !env.COHERE_API_KEY) {
          answer = `${answer} Data-query mode needs AI query planning to be enabled on the backend.`
        }
      }

      const llmAnswer = dataQuery
        ? null
        : await refineAnswerWithCohere({
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
        dataQuery,
      }
    }),
}
