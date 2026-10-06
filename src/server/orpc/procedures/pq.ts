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
  recentOps: PqTestnetOp[]
  recentFrames: PqTestnetFrameTx[]
  checkedAt: string
}

const DAISUGI_EXPLORER = 'https://explorer.daisugi.fyi'
const DAISUGI_RPC = 'https://daisugi.fyi/rpc'
let testnetCache: { at: number; data: PqTestnet } | null = null
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
        success?: boolean; actualGasCost?: string; timestamp?: number
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
