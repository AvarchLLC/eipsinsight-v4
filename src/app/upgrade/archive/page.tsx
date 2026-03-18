'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, FileText, GitBranch, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/header';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';

type UpgradeType = 'Hard Fork' | 'Merge';
type LayerType = 'execution' | 'consensus' | 'beacon_genesis';

interface HistoricalUpgrade {
  name: string;
  slug: string;
  date: string;
  eipCount: number;
  type: UpgradeType;
  layer: LayerType;
  summary: string;
  description: string;
  impact: string;
  relatedLinks: Array<{ title: string; url: string }>;
}

const previousUpgrades: HistoricalUpgrade[] = [
  {
    name: 'Frontier',
    slug: 'frontier',
    date: '2015-07-30',
    eipCount: 0,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'Ethereum mainnet launch and foundational protocol activation.',
    description:
      'Frontier was the first Ethereum mainnet release, enabling the deployment of smart contracts and the beginning of decentralized applications on the network.',
    impact: 'Genesis of Ethereum network; established core protocol functionality.',
    relatedLinks: [{ title: 'Ethereum History', url: 'https://etherworld.co/tag/ethereum-history/' }],
  },
  {
    name: 'Homestead',
    slug: 'homestead',
    date: '2016-03-14',
    eipCount: 3,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'First planned protocol upgrade focused on stability and safety.',
    description:
      'Homestead introduced critical safety improvements including the DELEGATECALL opcode and fixes to the contract creation process.',
    impact: 'Improved protocol safety and enabled complex contract interactions.',
    relatedLinks: [{ title: 'Homestead Hard Fork', url: 'https://etherworld.co/tag/hard-fork/' }],
  },
  {
    name: 'DAO Fork',
    slug: 'dao-fork',
    date: '2016-07-20',
    eipCount: 1,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'Emergency state transition to recover funds after The DAO exploit.',
    description:
      'Following the DAO hack, the community coordinated an irregular state change to recover stolen funds, establishing precedent for protocol governance.',
    impact: 'Protected network integrity; demonstrated community coordination.',
    relatedLinks: [{ title: 'DAO Attack & Fork', url: 'https://etherworld.co/tag/dao/' }],
  },
  {
    name: 'Tangerine Whistle',
    slug: 'tangerine-whistle',
    date: '2016-10-18',
    eipCount: 1,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'DoS mitigation via gas repricing of state-heavy operations.',
    description:
      'This upgrade addressed denial-of-service vulnerabilities by repricing gas for state-access operations, making attacks economically infeasible.',
    impact: 'Enhanced network resilience against spam attacks.',
    relatedLinks: [{ title: 'EIP-150 Explained', url: 'https://etherworld.co/tag/eip-150/' }],
  },
  {
    name: 'Spurious Dragon',
    slug: 'spurious-dragon',
    date: '2016-11-22',
    eipCount: 4,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'Further anti-DoS hardening and state cleanup improvements.',
    description:
      'Spurious Dragon continued security improvements with EXP gas repricing, contract code size limits, and transaction replay protection via ChainID.',
    impact: 'Hardened against further DoS vectors; enabled cross-chain transaction safety.',
    relatedLinks: [{ title: 'EIP-155 Replay Protection', url: 'https://etherworld.co/tag/eip-155/' }],
  },
  {
    name: 'Byzantium',
    slug: 'byzantium',
    date: '2017-10-16',
    eipCount: 9,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'Major Metropolis phase with privacy and VM upgrades.',
    description:
      'Byzantium was a significant upgrade introducing the REVERT opcode, zk-SNARKs precompiles, and block rewards reduction toward Proof-of-Stake.',
    impact: 'Enabled privacy technologies; reduced inflation; modernized EVM.',
    relatedLinks: [{ title: 'Byzantium Hard Fork', url: 'https://etherworld.co/tag/byzantium/' }],
  },
  {
    name: 'Constantinople',
    slug: 'constantinople',
    date: '2019-02-28',
    eipCount: 5,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'EVM efficiency improvements and delayed difficulty bomb updates.',
    description:
      'Constantinople optimized EVM operations (SSTORE gas cost, CREATE2, bitwise shifting) and further delayed the difficulty bomb.',
    impact: 'Reduced smart contract deployment costs; improved EVM performance.',
    relatedLinks: [{ title: 'Constantinople Hard Fork', url: 'https://etherworld.co/tag/constantinople/' }],
  },
  {
    name: 'Istanbul',
    slug: 'istanbul',
    date: '2019-12-07',
    eipCount: 6,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'Interoperability and gas model updates for scalability readiness.',
    description:
      'Istanbul introduced gas repricing for state-rent preparation (EIP-1679), privacy-enabling precompiles, and STATICCALL optimizations.',
    impact: 'Prepared network for scalability solutions; enhanced interoperability.',
    relatedLinks: [{ title: 'Istanbul Hard Fork', url: 'https://etherworld.co/tag/istanbul/' }],
  },
  {
    name: 'Berlin',
    slug: 'berlin',
    date: '2021-04-15',
    eipCount: 4,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'Gas repricing and transaction format improvements.',
    description:
      'Berlin optimized gas accounting for state-access operations and introduced transaction access lists to enable more efficient L2 solutions.',
    impact: 'Improved L2 scalability readiness; optimized gas costs.',
    relatedLinks: [{ title: 'Berlin Hard Fork', url: 'https://etherworld.co/tag/berlin/' }],
  },
  {
    name: 'London',
    slug: 'london',
    date: '2021-08-05',
    eipCount: 5,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'Introduced EIP-1559 fee market and burn mechanism.',
    description:
      "London fundamentally reformed Ethereum's fee market with dynamic base fees, burn mechanics, and the BASEFEE opcode, improving UX and reducing inflation.",
    impact: 'Revolutionized fee market; began ETH deflation; improved predictability.',
    relatedLinks: [{ title: 'EIP-1559 & London Fork', url: 'https://etherworld.co/tag/eip-1559/' }],
  },
  {
    name: 'Merge',
    slug: 'paris',
    date: '2022-09-15',
    eipCount: 2,
    type: 'Merge',
    layer: 'execution',
    summary: 'Transition from Proof-of-Work to Proof-of-Stake consensus.',
    description:
      "The Merge was Ethereum's highest-stakes upgrade, transitioning consensus from PoW to PoS, reducing energy consumption by 99.95% and establishing validator-based security.",
    impact: 'Reduced energy by 99.95%; shifted to Proof-of-Stake; enabled staking.',
    relatedLinks: [{ title: 'The Merge Explained', url: 'https://etherworld.co/tag/the-merge/' }],
  },
  {
    name: 'Shanghai',
    slug: 'shanghai',
    date: '2023-04-12',
    eipCount: 4,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'Enabled staked ETH withdrawals and execution-layer refinements.',
    description:
      'Shanghai allowed validators to withdraw accrued staking rewards and exited stake, fulfilling a critical Proof-of-Stake requirement.',
    impact: 'Unlocked staking; completed PoS functionality; enabled validator exits.',
    relatedLinks: [{ title: 'Shanghai Upgrade', url: 'https://etherworld.co/tag/shanghai/' }],
  },
  {
    name: 'Cancun',
    slug: 'cancun',
    date: '2024-03-13',
    eipCount: 6,
    type: 'Hard Fork',
    layer: 'execution',
    summary: 'Delivered proto-danksharding groundwork for L2 scaling.',
    description:
      'Cancun introduced EIP-4844 (blobs), enabling Layer 2 solutions to post data more economically and reducing rollup costs by orders of magnitude.',
    impact: 'Enabled L2 scaling; reduced rollup costs; laid danksharding groundwork.',
    relatedLinks: [{ title: 'EIP-4844 & Cancun', url: 'https://etherworld.co/tag/eip-4844/' }],
  },
];

const sortedUpgrades = [...previousUpgrades].sort(
  (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
);

const totalEips = sortedUpgrades.reduce((sum, upgrade) => sum + upgrade.eipCount, 0);
const avgEips = (totalEips / sortedUpgrades.length).toFixed(1);
const largestUpgrade = sortedUpgrades.reduce((max, u) => (u.eipCount > max.eipCount ? u : max), sortedUpgrades[0]);
const maxEips = Math.max(...sortedUpgrades.map((upgrade) => upgrade.eipCount));

function sizeScore(eipCount: number) {
  return Math.max(1, Math.min(10, Math.round((eipCount / maxEips) * 10)));
}

function monthsBetween(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return Math.max(0, (db.getFullYear() - da.getFullYear()) * 12 + (db.getMonth() - da.getMonth()));
}

export default function PreviousUpgradesPage() {
  const [selectedSlug, setSelectedSlug] = useState<string>(sortedUpgrades[sortedUpgrades.length - 1].slug);

  const selected = useMemo(
    () => sortedUpgrades.find((u) => u.slug === selectedSlug) ?? sortedUpgrades[sortedUpgrades.length - 1],
    [selectedSlug],
  );

  return (
    <div className="bg-background min-h-screen w-full">
      <PageHeader
        eyebrow="Archive"
        indicator={{ icon: 'chart', label: 'History', pulse: false }}
        title="Previous Upgrades (2015–2024)"
        description="Historical upgrade overview with timeline spacing, size comparison, and upgrade-level context."
        sectionId="previous-upgrades-overview"
        className="bg-background [&>div:last-child]:px-5 sm:[&>div:last-child]:px-6 lg:[&>div:last-child]:px-7 xl:[&>div:last-child]:px-8"
      />

      <div className="w-full px-3 pb-10 sm:px-4 lg:px-5 xl:px-6">
        <div className="h-px w-full bg-border/60" />

        <section className="pt-6 pb-4">
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">At A Glance</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">High-level snapshot and upgrade spacing across eras.</p>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Upgrades</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{sortedUpgrades.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Included EIPs</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{totalEips}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Avg EIPs / Upgrade</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">{avgEips}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Largest Bundle</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{largestUpgrade.name}</p>
              <p className="text-xs text-muted-foreground">{largestUpgrade.eipCount} EIPs</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-card/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline Density</h3>
            <div className="mt-3 overflow-x-auto">
              <div className="flex min-w-max items-center gap-2 pb-1">
                {sortedUpgrades.map((upgrade, idx) => {
                  const gap = idx === 0 ? 0 : monthsBetween(sortedUpgrades[idx - 1].date, upgrade.date);
                  return (
                    <div key={upgrade.slug} className="flex items-center gap-2">
                      {idx > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="h-px w-8 bg-border" />
                          <span className="text-[10px] font-medium text-muted-foreground">{gap}m</span>
                          <div className="h-px w-8 bg-border" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedSlug(upgrade.slug)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-left transition-colors',
                          selectedSlug === upgrade.slug
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-border bg-muted/30 hover:border-primary/30 hover:bg-primary/5',
                        )}
                      >
                        <p className="text-xs font-semibold text-foreground">{upgrade.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(upgrade.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="h-px w-full bg-border/60" />

        <section className="pt-6 pb-4">
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Upgrade Index</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Sortable-style compact index for quick scanning and selection.</p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card/60">
            <table className="w-full min-w-[840px]">
              <thead>
                <tr className="border-b border-border/70">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Upgrade</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">EIPs</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Size Score</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...sortedUpgrades].reverse().map((upgrade) => {
                  const score = sizeScore(upgrade.eipCount);
                  const isSelected = upgrade.slug === selected.slug;
                  return (
                    <tr
                      key={upgrade.slug}
                      className={cn(
                        'border-b border-border/60 last:border-0 transition-colors',
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/40',
                      )}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{upgrade.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(upgrade.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground tabular-nums">{upgrade.eipCount}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground tabular-nums">{score}/10</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                            upgrade.type === 'Merge'
                              ? 'border-violet-400/30 bg-violet-500/10 text-violet-700 dark:text-violet-300'
                              : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                          )}
                        >
                          {upgrade.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSlug(upgrade.slug)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/15"
                        >
                          View
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="h-px w-full bg-border/60" />

        <section className="pt-6">
          <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Selected Upgrade</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Why it mattered, with direct links for deeper exploration.</p>

          <motion.div
            key={selected.slug}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="relative mt-4 overflow-hidden rounded-xl border border-border bg-card/70 p-5 backdrop-blur-sm"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/10 to-transparent" />

            <div className="relative flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{selected.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{selected.summary}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(selected.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <GitBranch className="h-3.5 w-3.5" />
                  {selected.eipCount} EIPs
                </span>
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                    selected.type === 'Merge'
                      ? 'border-violet-400/30 bg-violet-500/10 text-violet-700 dark:text-violet-300'
                      : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                  )}
                >
                  {selected.type}
                </span>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Included EIPs</p>
                <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{selected.eipCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Size Score</p>
                <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{sizeScore(selected.eipCount)}/10</p>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{selected.type}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Year</p>
                <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{new Date(selected.date).getFullYear()}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selected.description}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Impact Highlights</h4>
                <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 text-primary" />
                    <span>{selected.impact}</span>
                  </li>
                </ul>
              </div>
            </div>

            {selected.relatedLinks.length > 0 && (
              <div className="mt-5 border-t border-border/60 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.relatedLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {link.title}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              <Link
                href={`/upgrade/${selected.slug}`}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/15 hover:shadow-md hover:shadow-primary/10"
              >
                Explore Full Upgrade
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
