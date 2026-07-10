/**
 * ethpandaops hosts a standard set of per-devnet services at convention
 * subdomains: `<service>.<network>.ethpandaops.io`, where `<network>` is the
 * devnet id (e.g. `fusaka-devnet-3`). Verified live against `bal-devnet-7` and
 * `glamsterdam-devnet-6`. These derive purely from the id — no scrape/storage —
 * but they only resolve while the devnet is running, so only surface them for
 * active, non-canceled devnets (torn-down devnets return dead links).
 *
 * `beacon`/`config` subdomains do NOT follow the convention reliably and are
 * intentionally omitted.
 */
export interface DevnetResource {
  key: string;
  label: string;
  description: string;
  url: string;
}

const SERVICES: Array<Omit<DevnetResource, 'url'> & { sub: string }> = [
  { key: 'dora', sub: 'dora', label: 'Dora Explorer', description: 'Beacon-chain block & epoch explorer' },
  { key: 'rpc', sub: 'rpc', label: 'Execution RPC', description: 'JSON-RPC endpoint' },
  { key: 'faucet', sub: 'faucet', label: 'Faucet', description: 'Request test ETH' },
  { key: 'checkpoint-sync', sub: 'checkpoint-sync', label: 'Checkpoint Sync', description: 'Beacon checkpoint-sync endpoint' },
  { key: 'forky', sub: 'forky', label: 'Forky', description: 'Fork-choice visualizer' },
  { key: 'forkmon', sub: 'forkmon', label: 'Forkmon', description: 'Fork monitor across clients' },
  { key: 'assertoor', sub: 'assertoor', label: 'Assertoor', description: 'Automated testing dashboard' },
];

/** Convention service links for a devnet id (empty for malformed ids). */
export function devnetResourceLinks(id: string): DevnetResource[] {
  if (!/^[a-z0-9-]+$/.test(id)) return [];
  return SERVICES.map(({ sub, ...rest }) => ({
    ...rest,
    url: `https://${sub}.${id}.ethpandaops.io`,
  }));
}
