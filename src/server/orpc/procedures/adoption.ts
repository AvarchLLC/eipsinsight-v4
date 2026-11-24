import { z } from 'zod'
import { optionalAuthProcedure } from './types'
import { clickhouseConfigured, clickhouseQuery } from '@/lib/clickhouse'
import { STANDARDS, DEFERRED, COVERAGE, SIG, type Standard } from '@/data/adoption-standards'

/**
 * EIP / ERC on-chain adoption metrics for the /adoption dashboard.
 *
 * Evidence-based detection over our own Ethereum archive index in ClickHouse
 * (`ethereum.contract_events` — a pre-aggregated (address, topic0) rollup, and
 * `ethereum.logs` — raw event logs). No third-party classification table.
 *
 *  • contracts — distinct contract addresses that have emitted a standard's
 *    event signature at least once within coverage (all-time floor).
 *  • active    — distinct contracts that emitted it within the selected window.
 *  • events    — raw event count in the window (for ERC-4337 this is UserOps).
 *
 * The shared ERC-20/721 Transfer signature is split by whether tokenId is an
 * indexed topic (topic3 present ⇒ ERC-721, absent ⇒ ERC-20).
 *
 * Coverage begins at the Dencun block (19,426,587 / 2024-03-13); counts are a
 * conservative floor vs full history. Mainnet only. See src/data/adoption-standards.ts.
 */

const LEADERBOARD_TTL_MS = 600_000 // 10 min
const ALLTIME_TTL_MS = 6 * 3_600_000 // 6 h — the heavy all-time Transfer split

const N = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

export type Window = '24h' | '7d' | '30d'
const WINDOW_SQL: Record<Window, string> = {
  '24h': 'INTERVAL 1 DAY',
  '7d': 'INTERVAL 7 DAY',
  '30d': 'INTERVAL 30 DAY',
}

export type AdoptionRow = {
  id: string
  eip: string
  name: string
  category: Standard['category']
  blurb: string
  specUrl: string
  confidence: Standard['confidence']
  evidence: string
  contracts: number // all-time within coverage
  active: number // in window
  events: number // in window
}

export type AdoptionLeaderboard = {
  available: boolean
  window: Window
  rows: AdoptionRow[]
  coverage: typeof COVERAGE
  generatedAt: string
}

export type CatalogEntry = {
  id: string
  eip: string
  name: string
  category: Standard['category']
  blurb: string
  specUrl: string
  confidence: Standard['confidence']
  evidence: string
  ranked: boolean
  deferredReason: string | null
}

export type AdoptionOverview = {
  available: boolean
  standardsRanked: number
  standardsTracked: number
  totalImplementations: number // summed across ranked standards (a contract can implement several)
  activeContracts30d: number
  networks: number
  coverage: typeof COVERAGE
  catalog: CatalogEntry[]
  generatedAt: string
}

// Event-kind standards (unique signatures) and their topic sets.
const EVENT_STANDARDS = STANDARDS.filter((s) => s.detect.kind === 'event') as (Standard & {
  detect: { kind: 'event'; topics: string[] }
})[]
const ALL_EVENT_TOPICS = EVENT_STANDARDS.flatMap((s) => s.detect.topics)

const quote = (xs: string[]) => xs.map((x) => `'${x}'`).join(',')

// A ClickHouse multiIf mapping topic0 -> standard id, for correct per-standard
// distinct-address counts (a standard may declare several event topics).
function topicToStandardSql(): string {
  const arms = EVENT_STANDARDS.map((s) => `topic0 IN (${quote(s.detect.topics)}),'${s.id}'`).join(', ')
  return `multiIf(${arms}, '')`
}

// ── all-time ERC-20 / ERC-721 split (heavy ~20s; cached long) ───────────────
let allTimeTransfer: { at: number; erc20: number; erc721: number } | null = null
async function getAllTimeTransferSplit(): Promise<{ erc20: number; erc721: number }> {
  if (allTimeTransfer && Date.now() - allTimeTransfer.at < ALLTIME_TTL_MS) {
    return { erc20: allTimeTransfer.erc20, erc721: allTimeTransfer.erc721 }
  }
  const rows = await clickhouseQuery<{ erc20: string; erc721: string }>(
    `SELECT uniqExactIf(address, topic3 IS NULL) AS erc20, uniqExactIf(address, topic3 IS NOT NULL) AS erc721
     FROM ethereum.logs WHERE topic0 = '${SIG.TRANSFER}'`,
    { timeoutMs: 60_000 },
  )
  const erc20 = N(rows[0]?.erc20)
  const erc721 = N(rows[0]?.erc721)
  allTimeTransfer = { at: Date.now(), erc20, erc721 }
  return { erc20, erc721 }
}

// ── leaderboard ─────────────────────────────────────────────────────────────
const leaderboardCache = new Map<Window, { at: number; data: AdoptionLeaderboard }>()

function emptyLeaderboard(window: Window): AdoptionLeaderboard {
  return { available: false, window, rows: [], coverage: COVERAGE, generatedAt: new Date().toISOString() }
}

async function getLeaderboard(window: Window): Promise<AdoptionLeaderboard> {
  if (!clickhouseConfigured()) return emptyLeaderboard(window)
  const hit = leaderboardCache.get(window)
  if (hit && Date.now() - hit.at < LEADERBOARD_TTL_MS) return hit.data

  try {
    const interval = WINDOW_SQL[window]
    const sidSql = topicToStandardSql()

    const [eventRows, eventVolRows, transferWindowRows, transferAllTime] = await Promise.all([
      // event-standards: all-time contracts + active-in-window, per standard
      clickhouseQuery<{ sid: string; contracts: string; active: string }>(
        `SELECT ${sidSql} AS sid, uniqExact(address) AS contracts,
                uniqExactIf(address, last_seen >= now() - ${interval}) AS active
         FROM ethereum.contract_events
         WHERE topic0 IN (${quote(ALL_EVENT_TOPICS)})
         GROUP BY sid`,
        { timeoutMs: 45_000 },
      ),
      // event-standards: raw event volume in window
      clickhouseQuery<{ sid: string; events: string }>(
        `SELECT ${sidSql} AS sid, count() AS events
         FROM ethereum.logs
         WHERE block_timestamp >= now() - ${interval} AND topic0 IN (${quote(ALL_EVENT_TOPICS)})
         GROUP BY sid`,
        { timeoutMs: 45_000 },
      ),
      // transfer split: active + events in window
      clickhouseQuery<{ is20: number; active: string; events: string }>(
        `SELECT (topic3 IS NULL) AS is20, uniqExact(address) AS active, count() AS events
         FROM ethereum.logs
         WHERE block_timestamp >= now() - ${interval} AND topic0 = '${SIG.TRANSFER}'
         GROUP BY is20`,
        { timeoutMs: 45_000 },
      ),
      getAllTimeTransferSplit(),
    ])

    const contractsBy = new Map<string, number>()
    const activeBy = new Map<string, number>()
    const eventsBy = new Map<string, number>()
    for (const r of eventRows) {
      if (!r.sid) continue
      contractsBy.set(r.sid, N(r.contracts))
      activeBy.set(r.sid, N(r.active))
    }
    for (const r of eventVolRows) if (r.sid) eventsBy.set(r.sid, N(r.events))

    // transfer window rows: is20 === 1 -> erc-20, else erc-721
    for (const r of transferWindowRows) {
      const id = N(r.is20) === 1 ? 'erc-20' : 'erc-721'
      activeBy.set(id, N(r.active))
      eventsBy.set(id, N(r.events))
    }
    contractsBy.set('erc-20', transferAllTime.erc20)
    contractsBy.set('erc-721', transferAllTime.erc721)

    const rows: AdoptionRow[] = STANDARDS.map((s) => ({
      id: s.id,
      eip: s.eip,
      name: s.name,
      category: s.category,
      blurb: s.blurb,
      specUrl: s.specUrl,
      confidence: s.confidence,
      evidence: s.evidence,
      contracts: contractsBy.get(s.id) ?? 0,
      active: activeBy.get(s.id) ?? 0,
      events: eventsBy.get(s.id) ?? 0,
    })).sort((a, b) => b.active - a.active)

    const data: AdoptionLeaderboard = {
      available: true,
      window,
      rows,
      coverage: COVERAGE,
      generatedAt: new Date().toISOString(),
    }
    leaderboardCache.set(window, { at: Date.now(), data })
    return data
  } catch {
    return emptyLeaderboard(window)
  }
}

function buildCatalog(): CatalogEntry[] {
  const ranked: CatalogEntry[] = STANDARDS.map((s) => ({
    id: s.id, eip: s.eip, name: s.name, category: s.category, blurb: s.blurb,
    specUrl: s.specUrl, confidence: s.confidence, evidence: s.evidence,
    ranked: true, deferredReason: null,
  }))
  const deferred: CatalogEntry[] = DEFERRED.map((s) => ({
    id: s.id, eip: s.eip, name: s.name, category: s.category, blurb: s.blurb,
    specUrl: s.specUrl, confidence: s.confidence, evidence: s.evidence,
    ranked: false, deferredReason: s.detect.kind === 'deferred' ? s.detect.reason : null,
  }))
  return [...ranked, ...deferred]
}

async function getOverview(): Promise<AdoptionOverview> {
  const catalog = buildCatalog()
  const base = {
    standardsRanked: STANDARDS.length,
    standardsTracked: STANDARDS.length + DEFERRED.length,
    networks: 1,
    coverage: COVERAGE,
    catalog,
    generatedAt: new Date().toISOString(),
  }
  if (!clickhouseConfigured()) {
    return { available: false, totalImplementations: 0, activeContracts30d: 0, ...base }
  }
  const lb = await getLeaderboard('30d')
  if (!lb.available) {
    return { available: false, totalImplementations: 0, activeContracts30d: 0, ...base }
  }
  const totalImplementations = lb.rows.reduce((s, r) => s + r.contracts, 0)
  const activeContracts30d = lb.rows.reduce((s, r) => s + r.active, 0)
  return { available: true, totalImplementations, activeContracts30d, ...base }
}

// ── per-standard detail: metrics + contract directory ──────────────────────
export type DirectoryRow = { address: string; events: number; lastActive: string }

export type StandardDetail = {
  available: boolean
  found: boolean
  ranked: boolean
  id: string
  window: Window
  meta: {
    eip: string
    name: string
    category: Standard['category']
    blurb: string
    specUrl: string
    confidence: Standard['confidence']
  } | null
  deferredReason: string | null
  metrics: { contracts: number; active: number; events: number }
  directory: DirectoryRow[]
  coverage: typeof COVERAGE
  generatedAt: string
}

const DETAIL_TTL_MS = 600_000 // 10 min
const detailCache = new Map<string, { at: number; data: StandardDetail }>()

function metaOf(s: Standard) {
  return { eip: s.eip, name: s.name, category: s.category, blurb: s.blurb, specUrl: s.specUrl, confidence: s.confidence }
}

async function getStandardDetail(id: string, window: Window): Promise<StandardDetail> {
  const ranked = STANDARDS.find((s) => s.id === id)
  const deferred = DEFERRED.find((s) => s.id === id)
  const s = ranked ?? deferred
  const baseShell = {
    window,
    coverage: COVERAGE,
    generatedAt: new Date().toISOString(),
    metrics: { contracts: 0, active: 0, events: 0 },
    directory: [] as DirectoryRow[],
  }

  if (!s) {
    return { available: true, found: false, ranked: false, id, meta: null, deferredReason: null, ...baseShell }
  }
  if (!ranked) {
    // tracked but not yet detectable from events
    const reason = deferred && deferred.detect.kind === 'deferred' ? deferred.detect.reason : null
    return { available: true, found: true, ranked: false, id, meta: metaOf(s), deferredReason: reason, ...baseShell }
  }
  if (!clickhouseConfigured()) {
    return { available: false, found: true, ranked: true, id, meta: metaOf(s), deferredReason: null, ...baseShell }
  }

  const cacheKey = `${id}|${window}`
  const hit = detailCache.get(cacheKey)
  if (hit && Date.now() - hit.at < DETAIL_TTL_MS) return hit.data

  try {
    const interval = WINDOW_SQL[window]
    let metrics = { contracts: 0, active: 0, events: 0 }
    let directory: DirectoryRow[] = []

    if (ranked.detect.kind === 'transfer') {
      const cond = ranked.detect.side === 'erc20' ? 'topic3 IS NULL' : 'topic3 IS NOT NULL'
      const [winRows, allTime, dirRows] = await Promise.all([
        clickhouseQuery<{ active: string; events: string }>(
          `SELECT uniqExact(address) AS active, count() AS events
           FROM ethereum.logs
           WHERE block_timestamp >= now() - ${interval} AND topic0 = '${SIG.TRANSFER}' AND ${cond}`,
          { timeoutMs: 45_000 },
        ),
        getAllTimeTransferSplit(),
        clickhouseQuery<{ address: string; events: string; last: string }>(
          `SELECT address, count() AS events, max(block_timestamp) AS last
           FROM ethereum.logs
           WHERE block_timestamp >= now() - ${interval} AND topic0 = '${SIG.TRANSFER}' AND ${cond}
           GROUP BY address ORDER BY events DESC LIMIT 25`,
          { timeoutMs: 45_000 },
        ),
      ])
      metrics = {
        contracts: ranked.detect.side === 'erc20' ? allTime.erc20 : allTime.erc721,
        active: N(winRows[0]?.active),
        events: N(winRows[0]?.events),
      }
      directory = dirRows.map((r) => ({ address: r.address, events: N(r.events), lastActive: r.last }))
    } else if (ranked.detect.kind === 'event') {
      const topics = ranked.detect.topics
      const [ceRows, logRows, dirRows] = await Promise.all([
        clickhouseQuery<{ contracts: string; active: string }>(
          `SELECT uniqExact(address) AS contracts, uniqExactIf(address, last_seen >= now() - ${interval}) AS active
           FROM ethereum.contract_events WHERE topic0 IN (${quote(topics)})`,
        ),
        clickhouseQuery<{ events: string }>(
          `SELECT count() AS events FROM ethereum.logs
           WHERE block_timestamp >= now() - ${interval} AND topic0 IN (${quote(topics)})`,
        ),
        clickhouseQuery<{ address: string; events: string; last: string }>(
          `SELECT address, count() AS events, max(block_timestamp) AS last
           FROM ethereum.logs
           WHERE block_timestamp >= now() - ${interval} AND topic0 IN (${quote(topics)})
           GROUP BY address ORDER BY events DESC LIMIT 25`,
        ),
      ])
      metrics = { contracts: N(ceRows[0]?.contracts), active: N(ceRows[0]?.active), events: N(logRows[0]?.events) }
      directory = dirRows.map((r) => ({ address: r.address, events: N(r.events), lastActive: r.last }))
    }

    const data: StandardDetail = {
      available: true,
      found: true,
      ranked: true,
      id,
      window,
      meta: metaOf(ranked),
      deferredReason: null,
      metrics,
      directory,
      coverage: COVERAGE,
      generatedAt: new Date().toISOString(),
    }
    detailCache.set(cacheKey, { at: Date.now(), data })
    return data
  } catch {
    return { available: false, found: true, ranked: true, id, meta: metaOf(ranked), deferredReason: null, ...baseShell }
  }
}

export const adoptionProcedures = {
  overview: optionalAuthProcedure.handler(async (): Promise<AdoptionOverview> => getOverview()),

  leaderboard: optionalAuthProcedure
    .input(z.object({ window: z.enum(['24h', '7d', '30d']).default('30d') }).optional())
    .handler(async ({ input }): Promise<AdoptionLeaderboard> => getLeaderboard(input?.window ?? '30d')),

  standard: optionalAuthProcedure
    .input(z.object({ id: z.string().min(1), window: z.enum(['24h', '7d', '30d']).default('30d') }))
    .handler(async ({ input }): Promise<StandardDetail> => getStandardDetail(input.id, input.window)),
}
