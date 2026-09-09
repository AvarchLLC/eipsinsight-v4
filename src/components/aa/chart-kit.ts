// Shared bits for the /aa ecosystem charts: a consistent dataZoom brush and USD
// formatters, so every chart's timeline and money labels look and behave the same.

// Recharts <Brush> config. Spread onto the element with an explicit dataKey, e.g.
//   <Brush dataKey="bucket" {...AA_BRUSH} />
// We deliberately leave tickFormatter unset so the brush shows the real bucket
// labels (e.g. "Jan 24") at its handles, turning it into a readable timeline.
export const AA_BRUSH = {
  height: 26,
  travellerWidth: 10,
  gap: 1,
  stroke: 'var(--chart-3)',
  fill: 'var(--muted)',
  fillOpacity: 0.35,
} as const;

/** Compact USD, e.g. $10.1M, $2.5M, $450K, $120. Value is dollars, not wei. */
export const usdCompact = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
};

/** Full USD with grouping, e.g. $12,345,678. */
export const usdFull = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

// Canonical colour per concept, shared across every /aa chart so the SAME thing
// is always the SAME colour. Both the transaction-type names (EIP-1559, ...) and
// the composition class names (Blob, Set-code, ...) are keyed here; a concept that
// appears under two names (EIP-4844 / Blob, EIP-7702 / Set-code) maps to one colour.
export const TYPE_COLOR: Record<string, string> = {
  // Transaction types (by the EIP that introduced them)
  Legacy: 'var(--chart-8)',
  'EIP-2930': 'var(--chart-6)',
  'EIP-1559': 'var(--chart-1)',
  'EIP-4844': 'var(--chart-4)',
  'EIP-7702': 'var(--chart-2)',
  // Composition classes (what a transaction does) — same colour for the same concept
  'Contract calls': 'var(--chart-1)',
  'Plain transfers': 'var(--chart-5)',
  'Blob (EIP-4844)': 'var(--chart-4)',
  'Set-code (EIP-7702)': 'var(--chart-2)',
};

export const typeColor = (label: string): string => TYPE_COLOR[label] ?? 'var(--chart-3)';

// Plain-English glossary for the unusual terms on this page. Shown in a small
// collapsible under the ecosystem charts so a first-time reader can decode them.
export const AA_TERMS: { term: string; def: string }[] = [
  { term: 'Legacy (type 0)', def: 'The original fixed gas-price transaction, from before EIP-1559.' },
  { term: 'EIP-2930 · access list (type 1)', def: 'A transaction that pre-declares the storage it will touch to make some calls cheaper.' },
  { term: 'EIP-1559 · dynamic fee (type 2)', def: 'The default format since 2021: a protocol base fee that is burned, plus a tip to the validator.' },
  { term: 'EIP-4844 · blob (type 3)', def: 'A blob-carrying transaction that posts cheap, short-lived data for L2 rollups (proto-danksharding). Live since Dencun, 2024.' },
  { term: 'EIP-7702 · set-code (type 4)', def: 'Lets a normal wallet temporarily run smart-account code while keeping its address and key. Live since Pectra, 2025.' },
  { term: 'ERC-4337 · EntryPoint', def: 'Smart-account wallets that run off-protocol through a shared EntryPoint contract, with no change to Ethereum itself. Live since 2023.' },
  { term: 'Gas', def: 'The unit that measures how much computation a transaction uses. Fees = gas used x gas price.' },
];
