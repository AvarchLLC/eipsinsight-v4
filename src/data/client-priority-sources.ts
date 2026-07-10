/**
 * Primary sources for client-team EIP priorities, per upgrade. These are the
 * teams' own published rankings (HackMD notes, blog posts, wiki pages, GitHub
 * comments) — NOT anyone's compilation. The scraper fetches each, an LLM
 * extracts structured stances, and the result is written to
 * `upgrade_client_priority` as our own owned data.
 *
 * Update these URLs each upgrade as teams publish new rankings.
 */

export type SourceFetch = 'markdown' | 'html' | 'github-issue-comment';

export interface ClientPrioritySource {
  url: string;
  fetch: SourceFetch;
  /** Teams whose ratings live in this doc (a shared doc can list several). */
  clients: string[];
  /** Skip fetching (e.g. unfetchable tweet) but keep for the record. */
  skip?: boolean;
  note?: string;
  promptInstructions?: string;
}

export const CLIENT_PRIORITY_SOURCES: Record<string, ClientPrioritySource[]> = {
  glamsterdam: [
    {
      url: 'https://hackmd.io/@RoboCopsGoneMad/GlamTiers',
      fetch: 'markdown',
      clients: ['Besu', 'Nethermind', 'Geth'],
      note: 'Shared EL tier list (A–S).',
    },
    {
      url: 'https://notes.ethereum.org/@fjl/geth-glamsterdam-eip-ranking',
      fetch: 'markdown',
      clients: ['Geth'],
      promptInstructions: 'CRITICAL: Do NOT invent or guess ratings for EIPs where the rating/tier is not explicitly stated in the text. For example, EIP-2926, EIP-7610, EIP-7708, and EIP-7745 have comments but no explicit support/opposition/tier written in the text — do NOT extract them or assign them a rating. Only extract EIPs where a tier (S, A, B, C, D) or direct support/opposition is explicitly written in the text. For those explicitly ranked: "S" means "Showcase" (non-consensus/needs discussion), map to normalizedScore = null. "A" means "Agree" (support), map to 5. "B" means "Indifferent" (neutral), map to 3. "C" means "Disagree" (oppose), map to 1. "D" means "No" (reject), map to 1.',
    },
    {
      url: 'https://github.com/erigontech/erigon/wiki/Glamsterdam-PFI-stand',
      fetch: 'markdown',
      clients: ['Erigon'],
    },
    {
      url: 'https://hackmd.io/@jenpaff/S1bj9gqkbe',
      fetch: 'markdown',
      clients: ['Reth'],
    },
    {
      url: 'https://hackmd.io/KUFN0UIMRgCLheMVzFmN5A',
      fetch: 'markdown',
      clients: ['Teku'],
    },
    {
      url: 'https://notes.status.im/s/6-ZIuquGe',
      fetch: 'markdown',
      clients: ['Nimbus'],
    },
    {
      url: 'https://blog.sigmaprime.io/glamsterdam-eip-preferences.html',
      fetch: 'html',
      clients: ['Lighthouse'],
    },
    {
      url: 'https://blog.chainsafe.io/lodestar-glamsterdam-upgrade-proposal/',
      fetch: 'html',
      clients: ['Lodestar'],
    },
    {
      url: 'https://github.com/ethereum/pm/issues/1790#issuecomment-3524246616',
      fetch: 'github-issue-comment',
      clients: ['Prysm'],
    },
    {
      url: 'https://x.com/URozmej/status/1986040895578296825',
      fetch: 'html',
      clients: ['Nethermind'],
      skip: true,
      note: 'X/Twitter — not reliably fetchable; Nethermind is also covered by GlamTiers.',
    },
  ],
};

/** EL/CL layer for each known client team (helps the extractor label stances). */
export const CLIENT_LAYER: Record<string, 'EL' | 'CL'> = {
  Geth: 'EL',
  Besu: 'EL',
  Nethermind: 'EL',
  Erigon: 'EL',
  Reth: 'EL',
  Lighthouse: 'CL',
  Lodestar: 'CL',
  Prysm: 'CL',
  Teku: 'CL',
  Nimbus: 'CL',
};
