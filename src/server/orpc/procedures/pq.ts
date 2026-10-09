import { optionalAuthProcedure } from './types'
import { prisma } from '@/lib/prisma'
import { PQ_EIPS, PQ_ROADMAP, implFor, PQ_EL_CLIENTS, PQ_CL_CLIENTS } from '@/data/pq-registry'

/**
 * Live enrichment for the Post-Quantum registry. The /pq pages carry curated
 * metadata; this overlays the current EIP status, when it last changed, and its
 * live upgrade bucket (PFI/CFI/SFI…) from the indexed EIP repository + upgrade
 * composition, so the registry stays accurate without manual edits.
 */
export interface PqLiveStatus {
  number: number
  status: string | null
  title: string | null
  /** ISO timestamp of the last snapshot change. */
  updatedAt: string | null
  /** Live upgrade association, if the EIP is in a tracked fork's composition. */
  upgrade: string | null
  upgradeBucket: string | null
}

// upgrade_composition_current.bucket → the PFI/CFI/SFI vocabulary the UI uses.
const BUCKET_LABEL: Record<string, string> = {
  proposed: 'PFI',
  considered: 'CFI',
  scheduled: 'SFI',
  declined: 'DFI',
  included: 'Deployed',
}

export interface PqAlert {
  level: 'high' | 'warn' | 'info'
  kind: string
  eip: number | null
  title: string
  detail: string
}

let cache: { at: number; data: Record<number, PqLiveStatus> } | null = null
let alertCache: { at: number; data: PqAlert[] } | null = null
const TTL_MS = 300_000

/** A node in the full requires-dependency graph (PQ or a required non-PQ EIP). */
export interface PqRequiresNode {
  number: number
  title: string
  /** True if the EIP is in the curated PQ registry. */
  isPq: boolean
}
/** A requires edge in the enables direction: `from` enables / is required by `to`. */
export interface PqRequiresEdge {
  from: number
  to: number
}
export interface PqRequiresGraph {
  nodes: PqRequiresNode[]
  edges: PqRequiresEdge[]
}
let requiresCache: { at: number; data: PqRequiresGraph } | null = null

/** A recent ERC-4337 UserOperation on the Daisugi testnet. */
export interface PqTestnetOp {
  userOpHash: string
  txHash: string
  sender: string
  paymaster: string | null
  success: boolean
  actualGasCost: string
  timestamp: number
}

/** A recent native EIP-8141 frame transaction on the Daisugi testnet. */
export interface PqTestnetFrameTx {
  hash: string
  from: string
  frameCount: number
  allSucceeded: boolean
  timestamp: number
}

export interface PqTestnet {
  /** Whether the live fetch succeeded; false falls back to curated copy. */
  online: boolean
  chainId: number
  /** 'operational' | 'degraded' | 'offline' | 'unknown' from the explorer. */
  status: string
  blockNumber: number | null
  entryPoint: string | null
  explorerBase: string
  rpc: string
  smartAccounts: number
  nativeWallets: number
  /** Total indexed ERC-4337 UserOperations. */
  operationCount: number
  /** Share of indexed UserOperations that succeeded (0–1). */
  operationSuccessRate: number | null
  /** Total indexed native frame transactions (EIP-8141, type 0x06). */
  frameTxCount: number
  frameTxSuccessRate: number | null
  /** Median gas used by a PQ (SPHINCS+) UserOp over the recent window. */
  gasUsedMedian: number | null
  /** gasUsedMedian ÷ 21,000 (a plain ECDSA transfer), for "N× a normal send". */
  gasBaselineMultiple: number | null
  /** Distinct ERC-4337 senders seen in the recent UserOp window. */
  distinctSenders: number
  /** Distinct native-frame senders seen in the recent frame-tx window. */
  distinctFrameSenders: number
  /** Frame-count → number of frame txs with that many frames (EIP-8141 batching). */
  framesPerTx: Record<string, number>
  recentOps: PqTestnetOp[]
  recentFrames: PqTestnetFrameTx[]
  checkedAt: string
}

/** A plain ECDSA value transfer, the yardstick for PQ signature cost. */
const ECDSA_BASELINE_GAS = 21_000

/** One daily growth point for the Daisugi testnet (ascending by date). */
export interface PqTestnetPoint {
  /** YYYY-MM-DD */
  date: string
  smartAccounts: number
  operations: number
  frameTxs: number
  /** Recent-window median gas used by a PQ UserOp that day (null if not recorded). */
  gasUsedMedian: number | null
}

const DAISUGI_EXPLORER = 'https://explorer.daisugi.fyi'
const DAISUGI_RPC = 'https://daisugi.fyi/rpc'
let testnetCache: { at: number; data: PqTestnet } | null = null
let historyCache: { at: number; data: PqTestnetPoint[] } | null = null
// Shorter TTL than the DB overlays: this is live network telemetry.
const TESTNET_TTL_MS = 120_000

async function fetchJson(url: string, timeoutMs = 10_000): Promise<unknown> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

function rate(items: Array<{ success?: boolean; allSucceeded?: boolean }>, key: 'success' | 'allSucceeded'): number | null {
  if (!items.length) return null
  const ok = items.filter((x) => x[key]).length
  return ok / items.length
}

function median(nums: number[]): number | null {
  const xs = nums.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b)
  if (!xs.length) return null
  const mid = Math.floor(xs.length / 2)
  return xs.length % 2 ? xs[mid]! : Math.round((xs[mid - 1]! + xs[mid]!) / 2)
}

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

async function fetchDaisugi(): Promise<PqTestnet> {
  const offline: PqTestnet = {
    online: false,
    chainId: 1337,
    status: 'unknown',
    blockNumber: null,
    entryPoint: null,
    explorerBase: DAISUGI_EXPLORER,
    rpc: DAISUGI_RPC,
    smartAccounts: 0,
    nativeWallets: 0,
    operationCount: 0,
    operationSuccessRate: null,
    frameTxCount: 0,
    frameTxSuccessRate: null,
    gasUsedMedian: null,
    gasBaselineMultiple: null,
    distinctSenders: 0,
    distinctFrameSenders: 0,
    framesPerTx: {},
    recentOps: [],
    recentFrames: [],
    checkedAt: new Date().toISOString(),
  }
  try {
    const [ovRaw, netRaw] = await Promise.all([
      fetchJson(`${DAISUGI_EXPLORER}/api/explorer/overview`),
      fetchJson(`${DAISUGI_EXPLORER}/api/network`).catch(() => null),
    ])
    const ov = ovRaw as {
      chainId?: number
      entryPoint?: string
      indexedTo?: number
      smartAccountCount?: number
      nativeWalletCount?: number
      operationCount?: number
      operations?: Array<{
        userOpHash?: string; transactionHash?: string; sender?: string; paymaster?: string
        success?: boolean; actualGasCost?: string; actualGasUsed?: string; timestamp?: number
      }>
      nativeFrames?: {
        count?: number
        transactions?: Array<{ hash?: string; from?: string; frameCount?: number; frameStatuses?: string[]; status?: string; timestamp?: number }>
      }
    }
    const net = netRaw as { status?: string; blockNumber?: number } | null

    const ops: PqTestnetOp[] = (ov.operations ?? []).map((o) => ({
      userOpHash: o.userOpHash ?? '',
      txHash: o.transactionHash ?? '',
      sender: o.sender ?? '',
      paymaster: o.paymaster && o.paymaster !== ZERO_ADDR ? o.paymaster : null,
      success: !!o.success,
      actualGasCost: o.actualGasCost ?? '0',
      timestamp: Number(o.timestamp ?? 0),
    }))
    const frameTxs = ov.nativeFrames?.transactions ?? []
    const frames: PqTestnetFrameTx[] = frameTxs.map((f) => ({
      hash: f.hash ?? '',
      from: f.from ?? '',
      frameCount: Number(f.frameCount ?? 0),
      allSucceeded: f.status === 'Success' && (f.frameStatuses ?? []).every((s) => s === 'Success'),
      timestamp: Number(f.timestamp ?? 0),
    }))

    // PQ-signature cost + reach signals, over the recent window the explorer returns.
    const gasUsedMedian = median((ov.operations ?? []).map((o) => Number(o.actualGasUsed ?? 0)))
    const framesPerTx: Record<string, number> = {}
    for (const f of frames) {
      if (f.frameCount > 0) framesPerTx[String(f.frameCount)] = (framesPerTx[String(f.frameCount)] ?? 0) + 1
    }

    return {
      online: true,
      chainId: Number(ov.chainId ?? 1337),
      status: net?.status ?? 'operational',
      blockNumber: Number(net?.blockNumber ?? ov.indexedTo ?? 0) || null,
      entryPoint: ov.entryPoint ?? null,
      explorerBase: DAISUGI_EXPLORER,
      rpc: DAISUGI_RPC,
      smartAccounts: Number(ov.smartAccountCount ?? 0),
      nativeWallets: Number(ov.nativeWalletCount ?? 0),
      operationCount: Number(ov.operationCount ?? ops.length),
      // Success rate is over the recent window the explorer returns, not all-time.
      operationSuccessRate: rate(ops, 'success'),
      frameTxCount: Number(ov.nativeFrames?.count ?? frames.length),
      frameTxSuccessRate: rate(frames, 'allSucceeded'),
      gasUsedMedian,
      gasBaselineMultiple: gasUsedMedian ? Math.round((gasUsedMedian / ECDSA_BASELINE_GAS) * 10) / 10 : null,
      distinctSenders: new Set(ops.map((o) => o.sender.toLowerCase()).filter(Boolean)).size,
      distinctFrameSenders: new Set(frames.map((f) => f.from.toLowerCase()).filter(Boolean)).size,
      framesPerTx,
      recentOps: ops.slice(0, 8),
      recentFrames: frames
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 8),
      checkedAt: new Date().toISOString(),
    }
  } catch {
    return offline
  }
}

export const pqProcedures = {
  getLiveStatuses: optionalAuthProcedure.handler(async (): Promise<Record<number, PqLiveStatus>> => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.data
    const numbers = PQ_EIPS.map((e) => e.number).filter((n) => Number.isInteger(n))
    if (!numbers.length) return {}
    try {
      // numbers come from our own static registry — safe to inline.
      const inList = numbers.join(',')
      const [statusRows, compRows] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ number: number | string; status: string | null; title: string | null; updated_at: Date | null }>>(
          `SELECT e.eip_number AS number, s.status, e.title, s.updated_at
           FROM eips e
           JOIN eip_snapshots s ON s.eip_id = e.id
           WHERE e.eip_number IN (${inList})`,
        ),
        prisma.$queryRawUnsafe<Array<{ number: number | string; slug: string; name: string | null; bucket: string | null }>>(
          `SELECT ucc.eip_number AS number, u.slug, u.name, ucc.bucket
           FROM upgrade_composition_current ucc
           JOIN upgrades u ON u.id = ucc.upgrade_id
           WHERE ucc.eip_number IN (${inList})`,
        ),
      ])

      // Prefer the most advanced bucket if an EIP is in more than one fork.
      const bucketRank: Record<string, number> = { proposed: 1, considered: 2, scheduled: 3, included: 4, declined: 0 }
      const compByNum = new Map<number, { upgrade: string; bucket: string }>()
      for (const r of compRows) {
        const n = Number(r.number)
        const bucket = (r.bucket ?? '').toLowerCase()
        const prev = compByNum.get(n)
        if (!prev || (bucketRank[bucket] ?? -1) > (bucketRank[prev.bucket] ?? -1)) {
          compByNum.set(n, { upgrade: r.name || r.slug, bucket })
        }
      }

      const map: Record<number, PqLiveStatus> = {}
      for (const r of statusRows) {
        const n = Number(r.number)
        if (n in map) continue
        const comp = compByNum.get(n)
        map[n] = {
          number: n,
          status: r.status,
          title: r.title,
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
          upgrade: comp?.upgrade ?? null,
          upgradeBucket: comp ? BUCKET_LABEL[comp.bucket] ?? comp.bucket : null,
        }
      }
      cache = { at: Date.now(), data: map }
      return map
    } catch {
      return {}
    }
  }),

  /**
   * Live snapshot of the Daisugi PQTS testnet, proxied from its public
   * explorer API (explorer.daisugi.fyi). Daisugi is where end-to-end PQ
   * signatures are actually exercised: ERC-4337 UserOperations signed with a
   * SPHINCS+ variant, plus native EIP-8141 frame transactions (type 0x06).
   *
   * The explorer is the authoritative index; we cache its aggregates for a few
   * minutes and surface counts, success rates and recent activity so the PQ
   * hub shows real testnet usage with deep links back to the explorer.
   */
  getTestnet: optionalAuthProcedure.handler(async (): Promise<PqTestnet> => {
    if (testnetCache && Date.now() - testnetCache.at < TESTNET_TTL_MS) return testnetCache.data
    const data = await fetchDaisugi()
    testnetCache = { at: Date.now(), data }
    return data
  }),

  /**
   * Daily growth history of the Daisugi testnet, recorded by the scheduler's
   * pqts_testnet_snapshots job (one row/day). Returns an ascending time series
   * of cumulative totals so the hub can chart adoption. Empty until the
   * scheduler has captured snapshots (table may not exist yet) — the UI then
   * hides the chart and shows a "collecting" note.
   */
  getTestnetHistory: optionalAuthProcedure.handler(async (): Promise<PqTestnetPoint[]> => {
    if (historyCache && Date.now() - historyCache.at < TESTNET_TTL_MS) return historyCache.data
    type Row = { snapshot_date: Date; smart_accounts: number; operation_count: number; frame_tx_count: number; median_gas_used?: number | string | null }
    const runQuery = (withGas: boolean) =>
      prisma.$queryRawUnsafe<Array<Row>>(
        `SELECT snapshot_date, smart_accounts, operation_count, frame_tx_count${withGas ? ', median_gas_used' : ''}
         FROM pqts_testnet_snapshots
         WHERE network = 'daisugi'
         ORDER BY snapshot_date ASC
         LIMIT 365`,
      )
    try {
      // median_gas_used is added by a later scheduler migration; fall back to the
      // base columns if the app deploys before that migration has run.
      let rows: Row[]
      try {
        rows = await runQuery(true)
      } catch {
        rows = await runQuery(false)
      }
      const data: PqTestnetPoint[] = rows.map((r) => ({
        date:
          r.snapshot_date instanceof Date
            ? r.snapshot_date.toISOString().slice(0, 10)
            : String(r.snapshot_date).slice(0, 10),
        smartAccounts: Number(r.smart_accounts) || 0,
        operations: Number(r.operation_count) || 0,
        frameTxs: Number(r.frame_tx_count) || 0,
        gasUsedMedian: r.median_gas_used != null ? Number(r.median_gas_used) || null : null,
      }))
      historyCache = { at: Date.now(), data }
      return data
    } catch {
      // Table not migrated yet, or transient DB error: no history to show.
      return []
    }
  }),

  /**
   * Full dependency surface: each PQ EIP's real `requires:` from the indexed
   * repository, which point at ANY EIP (mostly non-PQ foundational ones), not
   * just the curated PQ↔PQ relationships. Returns nodes (PQ + required EIPs,
   * with titles and a PQ flag) and edges in the enables direction
   * (required → dependent), ready to lay out as a graph.
   */
  getRequiresGraph: optionalAuthProcedure.handler(async (): Promise<PqRequiresGraph> => {
    if (requiresCache && Date.now() - requiresCache.at < TTL_MS) return requiresCache.data
    const pqNumbers = PQ_EIPS.map((e) => e.number).filter((n) => Number.isInteger(n))
    const empty: PqRequiresGraph = { nodes: [], edges: [] }
    if (!pqNumbers.length) return empty
    try {
      const inList = pqNumbers.join(',')
      const reqRows = await prisma.$queryRawUnsafe<Array<{ number: number | string; requires: string[] | null }>>(
        `SELECT e.eip_number AS number, s.requires
         FROM eips e JOIN eip_snapshots s ON s.eip_id = e.id
         WHERE e.eip_number IN (${inList})`,
      )

      // Edges: for each PQ EIP, requiredEip -> pqEip (required one enables it).
      const edges: PqRequiresEdge[] = []
      const involved = new Set<number>(pqNumbers)
      for (const r of reqRows) {
        const dependent = Number(r.number)
        for (const req of r.requires ?? []) {
          const reqNum = Number(req)
          if (!Number.isInteger(reqNum) || reqNum <= 0) continue
          involved.add(reqNum)
          edges.push({ from: reqNum, to: dependent })
        }
      }

      // Titles for every node (PQ + required). Prefer the curated PQ title.
      const pqTitle = new Map(PQ_EIPS.map((e) => [e.number, e.title]))
      const titleRows = involved.size
        ? await prisma.$queryRawUnsafe<Array<{ number: number | string; title: string | null }>>(
            `SELECT eip_number AS number, title FROM eips WHERE eip_number IN (${[...involved].join(',')})`,
          )
        : []
      const repoTitle = new Map(titleRows.map((t) => [Number(t.number), t.title ?? '']))

      const nodes: PqRequiresNode[] = [...involved].sort((a, b) => a - b).map((n) => ({
        number: n,
        title: pqTitle.get(n) ?? repoTitle.get(n) ?? '',
        isPq: pqNumbers.includes(n),
      }))

      const data = { nodes, edges }
      requiresCache = { at: Date.now(), data }
      return data
    } catch {
      return empty
    }
  }),

  /**
   * Coordinator alert feed: stale EIPs, recent status changes, declined
   * proposals, roadmap capabilities without an EIP, and unresolved
   * dependencies. Computed from the indexed repo + upgrade data + the curated
   * registry — no separate job needed.
   */
  getAlerts: optionalAuthProcedure.handler(async (): Promise<PqAlert[]> => {
    if (alertCache && Date.now() - alertCache.at < TTL_MS) return alertCache.data
    const alerts: PqAlert[] = []
    const numbers = PQ_EIPS.map((e) => e.number).filter((n) => Number.isInteger(n))
    const inList = numbers.join(',')
    const titleOf = (n: number) => PQ_EIPS.find((e) => e.number === n)?.title ?? `EIP-${n}`
    const DAY = 86_400_000

    try {
      const [snapRows, eventRows, compRows] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ number: number | string; updated_at: Date | null }>>(
          `SELECT e.eip_number AS number, s.updated_at
           FROM eips e JOIN eip_snapshots s ON s.eip_id = e.id
           WHERE e.eip_number IN (${inList})`,
        ),
        prisma.$queryRawUnsafe<Array<{ number: number | string; to_status: string; pr_number: number | null; changed_at: Date }>>(
          `SELECT e.eip_number AS number, ev.to_status, ev.pr_number, ev.changed_at
           FROM eip_status_events ev JOIN eips e ON e.id = ev.eip_id
           WHERE e.eip_number IN (${inList}) AND ev.changed_at > now() - interval '45 days'
           ORDER BY ev.changed_at DESC`,
        ),
        prisma.$queryRawUnsafe<Array<{ number: number | string; name: string | null; slug: string; bucket: string | null }>>(
          `SELECT ucc.eip_number AS number, u.name, u.slug, ucc.bucket
           FROM upgrade_composition_current ucc JOIN upgrades u ON u.id = ucc.upgrade_id
           WHERE ucc.eip_number IN (${inList})`,
        ),
      ])

      // Stale: no snapshot change in 60+ days.
      for (const r of snapRows) {
        if (!r.updated_at) continue
        const days = Math.floor((Date.now() - new Date(r.updated_at).getTime()) / DAY)
        if (days >= 60) {
          alerts.push({
            level: days >= 90 ? 'warn' : 'info',
            kind: 'stale',
            eip: Number(r.number),
            title: `${titleOf(Number(r.number))} unchanged ${days} days`,
            detail: `EIP-${Number(r.number)} has had no repository change in ${days} days.`,
          })
        }
      }

      // Recent status changes (last 45 days).
      for (const ev of eventRows) {
        const n = Number(ev.number)
        const days = Math.floor((Date.now() - new Date(ev.changed_at).getTime()) / DAY)
        alerts.push({
          level: ev.to_status === 'Stagnant' || ev.to_status === 'Withdrawn' ? 'warn' : 'info',
          kind: 'status-change',
          eip: n,
          title: `${titleOf(n)} moved to ${ev.to_status}`,
          detail: `EIP-${n} changed status ${days}d ago${ev.pr_number ? ` (PR #${ev.pr_number})` : ''}.`,
        })
      }

      // Declined (DFI) in a fork.
      for (const r of compRows) {
        if ((r.bucket ?? '').toLowerCase() === 'declined') {
          const n = Number(r.number)
          alerts.push({
            level: 'warn',
            kind: 'declined',
            eip: n,
            title: `${titleOf(n)} declined for ${r.name || r.slug}`,
            detail: `EIP-${n} is DFI (declined for inclusion) in ${r.name || r.slug}.`,
          })
        }
      }
    } catch {
      // DB unavailable — fall back to the static checks below only.
    }

    // Static checks (always available).
    for (const row of PQ_ROADMAP) {
      if (row.eip === '?' || row.eip === 'TBD') {
        alerts.push({
          level: 'warn',
          kind: 'roadmap-no-eip',
          eip: null,
          title: `Roadmap capability "${row.capability}" has no EIP`,
          detail: `The ${row.milestone} capability "${row.capability}" has research but no identified EIP.`,
        })
      }
    }
    for (const e of PQ_EIPS) {
      // Unresolved dependency (depends on an untracked EIP).
      for (const d of e.dependsOn ?? []) {
        if (!PQ_EIPS.find((x) => x.number === d)) {
          alerts.push({
            level: 'info',
            kind: 'unresolved-dep',
            eip: e.number,
            title: `${e.title} depends on untracked EIP-${d}`,
            detail: `EIP-${e.number} requires EIP-${d}, which is not in the PQ registry.`,
          })
        }
      }
      // No client implementation anywhere.
      const clients = e.layer === 'Consensus' ? PQ_CL_CLIENTS : PQ_EL_CLIENTS
      const anyImpl = [...clients, 'Devnet'].some((c) => implFor(e.number, c).state !== 'not-started')
      if (!anyImpl && e.role === 'Direct PQ') {
        alerts.push({
          level: 'info',
          kind: 'no-impl',
          eip: e.number,
          title: `${e.title} has no client implementation`,
          detail: `EIP-${e.number} is a Direct PQ proposal with no implementation started.`,
        })
      }
    }

    const order = { high: 0, warn: 1, info: 2 }
    alerts.sort((a, b) => order[a.level] - order[b.level])
    alertCache = { at: Date.now(), data: alerts }
    return alerts
  }),
}
