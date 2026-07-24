/**
 * Protocol call series metadata. Slugs match what the scheduler writes to
 * Short slugs follow the community convention used across protocol trackers.
 * One-off calls arrive as `one-off-<manifest-series>` and fall back to their
 * stored display name.
 */

export interface CallSeriesMeta {
  label: string;
  short: string;
  badgeClass: string;
}

const DEFAULT_BADGE = 'border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-300';

export const CALL_SERIES: Record<string, CallSeriesMeta> = {
  acde: {
    label: 'AllCoreDevs - Execution',
    short: 'ACDE',
    badgeClass: 'border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  acdc: {
    label: 'AllCoreDevs - Consensus',
    short: 'ACDC',
    badgeClass: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
  },
  acdt: {
    label: 'AllCoreDevs - Testing',
    short: 'ACDT',
    badgeClass: 'border-cyan-500/30 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  },
  acdtcl: {
    label: 'AllCoreDevs - Testing CL Breakout',
    short: 'ACDT-CL',
    badgeClass: 'border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300',
  },
  epbs: {
    label: 'ePBS Breakout',
    short: 'ePBS',
    badgeClass: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  },
  bal: {
    label: 'BAL Breakout',
    short: 'BAL',
    badgeClass: 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300',
  },
  focil: {
    label: 'FOCIL Breakout',
    short: 'FOCIL',
    badgeClass: 'border-orange-500/30 bg-orange-500/15 text-orange-700 dark:text-orange-300',
  },
  price: {
    label: 'Glamsterdam Repricings',
    short: 'Repricing',
    badgeClass: 'border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300',
  },
  tli: {
    label: 'Trustless Log Index',
    short: 'TLI',
    badgeClass: 'border-pink-500/30 bg-pink-500/15 text-pink-700 dark:text-pink-300',
  },
  pqts: {
    label: 'PQ Transaction Signatures',
    short: 'PQTS',
    badgeClass: 'border-yellow-500/30 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  },
  rpc: {
    label: 'RPC Standards',
    short: 'RPC',
    badgeClass: 'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300',
  },
  zkevm: {
    label: 'L1-zkEVM Breakout',
    short: 'zkEVM',
    badgeClass: 'border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
  },
  etm: {
    label: 'Encrypt The Mempool',
    short: 'ETM',
    badgeClass: 'border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300',
  },
  awd: {
    label: 'AllWalletDevs',
    short: 'AWD',
    badgeClass: 'border-lime-500/30 bg-lime-500/15 text-lime-700 dark:text-lime-300',
  },
  pqi: {
    label: 'PQ Interop',
    short: 'PQI',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  },
  fcr: {
    label: 'Fast Confirmation Rule',
    short: 'FCR',
    badgeClass: 'border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300',
  },
  aa: {
    label: 'Native Account Abstraction',
    short: 'AA',
    badgeClass: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  },
  p2p: {
    label: 'P2P Networking',
    short: 'P2P',
    badgeClass: 'border-green-500/30 bg-green-500/15 text-green-700 dark:text-green-300',
  },
  ssz: {
    label: 'SSZ Engine API',
    short: 'SSZ',
    badgeClass: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-600 dark:text-zinc-300',
  },
};

export function isOneOffSeries(series: string): boolean {
  return series.startsWith('one-off-');
}

export function callSeriesLabel(series: string): string {
  if (isOneOffSeries(series)) return 'One-off call';
  return CALL_SERIES[series]?.label ?? series.toUpperCase();
}

export function callSeriesShort(series: string): string {
  if (isOneOffSeries(series)) return '1-OFF';
  return CALL_SERIES[series]?.short ?? series.toUpperCase();
}

export function callSeriesBadgeClass(series: string): string {
  if (isOneOffSeries(series)) return DEFAULT_BADGE;
  return CALL_SERIES[series]?.badgeClass ?? DEFAULT_BADGE;
}

/** "AllCoreDevs — Execution #175" or the stored one-off name. */
export function callDisplayName(call: {
  series: string;
  call_number: string | null;
  display_name: string | null;
}): string {
  if (isOneOffSeries(call.series)) {
    return call.display_name || 'One-off call';
  }
  const base = callSeriesLabel(call.series);
  return call.call_number ? `${base} #${call.call_number}` : base;
}
