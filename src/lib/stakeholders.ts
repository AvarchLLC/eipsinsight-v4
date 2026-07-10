/**
 * Canonical stakeholder taxonomy used across the upgrade surfaces (stakeholders
 * tab, EIP cards, admin editor, AI generation). One source of truth so labels
 * stay consistent and are easy to reword.
 *
 * `key` is the stable internal id stored in eip_curations.stakeholder_impacts;
 * `label` / `blurb` are our own display wording.
 */
export const STAKEHOLDER_GROUPS = [
  {
    key: 'endUsers',
    label: 'Everyday users',
    blurb: 'People sending transactions and using apps.',
  },
  {
    key: 'appDevs',
    label: 'App & contract developers',
    blurb: 'Teams building smart contracts and dapps.',
  },
  {
    key: 'walletDevs',
    label: 'Wallet teams',
    blurb: 'Wallet and account-tooling builders.',
  },
  {
    key: 'toolingInfra',
    label: 'Infrastructure & tooling',
    blurb: 'Explorers, indexers, RPC and node infra.',
  },
  {
    key: 'layer2s',
    label: 'Layer 2 rollups',
    blurb: 'Rollups and other scaling networks.',
  },
  {
    key: 'stakersNodes',
    label: 'Validators & node operators',
    blurb: 'Everyone staking or running nodes.',
  },
  {
    key: 'elClients',
    label: 'Execution clients',
    blurb: 'Geth, Besu, Nethermind, Reth, Erigon…',
  },
  {
    key: 'clClients',
    label: 'Consensus clients',
    blurb: 'Lighthouse, Prysm, Teku, Nimbus, Lodestar…',
  },
] as const;

export type StakeholderKey = (typeof STAKEHOLDER_GROUPS)[number]['key'];

export const STAKEHOLDER_KEYS = STAKEHOLDER_GROUPS.map((g) => g.key) as StakeholderKey[];

export const STAKEHOLDER_LABEL: Record<string, string> = Object.fromEntries(
  STAKEHOLDER_GROUPS.map((g) => [g.key, g.label])
);
