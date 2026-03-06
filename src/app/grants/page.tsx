'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Heart, ExternalLink, ChevronDown, Github } from 'lucide-react';

interface Grant {
  id: string;
  name: string;
  amount?: string;
  startDate?: string;
  logo?: React.ReactNode;
  logoAlt?: string;
  tags: string[];
  status: 'active' | 'completed' | 'upcoming';
  milestones?: {
    title: string;
    description: string;
    completed: boolean;
  }[];
  impactCriteria?: string;
  awardedAmount?: string;
  unawardedAmount?: string;
  link?: string;
}

const grants: Grant[] = [
  {
    id: 'gg18-core',
    name: 'GG18 Core',
    amount: '$248',
    startDate: 'Aug 1, 2023',
    logo: (
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-white font-bold text-xs">
        GC
      </div>
    ),
    tags: ['COMMUNITY', 'GITCOIN', 'NETWORK', 'OPTIMISM'],
    status: 'active',
    milestones: [
      { title: 'Grant Round Launch', description: 'Official kickoff and application opening', completed: true },
      { title: 'Community Voting Phase', description: 'Community members vote on projects', completed: true },
      { title: 'Disbursement', description: 'Funds distributed to winning projects', completed: false },
    ],
    impactCriteria: 'Focus on Ethereum DAO mission: community impact and sustainability.',
  },
  {
    id: 'gg21-asia',
    name: 'Asia Round (GG21 Asia Round)',
    amount: '$57.22',
    startDate: 'Aug 7, 2024',
    logo: (
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-white font-bold text-xs">
        AR
      </div>
    ),
    tags: ['COMMUNITY', 'GITCOIN', 'NETWORK', 'OPTIMISM'],
    status: 'active',
    milestones: [
      { title: 'Regional Outreach', description: 'Engage Asian developer communities', completed: true },
      { title: 'Application Period', description: 'Collect submissions from regional projects', completed: true },
      { title: 'Evaluation Phase', description: 'Review and assess all submissions', completed: false },
    ],
    impactCriteria: 'Focus on adoption across Asian languages and developer communities.',
  },
  {
    id: 'octant',
    name: 'Octant',
    startDate: 'Mar 15, 2024',
    logo: (
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
        ◇
      </div>
    ),
    tags: ['OSS', 'INFRASTRUCTURE'],
    status: 'active',
    awardedAmount: '$28,000',
    milestones: [
      { title: 'Infrastructure Assessment', description: 'Evaluate critical infrastructure needs', completed: true },
      { title: 'Public Goods Identification', description: 'Identify impactful public goods projects', completed: true },
      { title: 'Ongoing Funding', description: 'Continuous support for selected projects', completed: true },
    ],
    impactCriteria: 'Web3 infrastructure improvements and open-source development excellence.',
  },
  {
    id: 'esp',
    name: 'Ecosystem Support Program (ESP)',
    logo: (
      <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
        ESP
      </div>
    ),
    tags: ['ESP'],
    status: 'active',
    awardedAmount: '$20,000',
    impactCriteria: 'Support for Ethereum ecosystem development and community initiatives.',
    link: '#',
  },
];

const GrantCard: React.FC<{ grant: Grant; index: number }> = ({ grant, index }) => {
  const [expanded, setExpanded] = useState(false);

  const tagColors: Record<string, string> = {
    COMMUNITY: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
    GITCOIN: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
    NETWORK: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
    OPTIMISM: 'bg-red-500/20 text-red-700 dark:text-red-300',
    OSS: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
    INFRASTRUCTURE: 'bg-green-500/20 text-green-700 dark:text-green-300',
    ESP: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="group rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white/80 to-slate-50/80 p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700/30 dark:from-slate-900/40 dark:to-slate-900/20"
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          {grant.logo && (
            <div className="flex-shrink-0">
              {grant.logo}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 break-words">{grant.name}</h3>
            {grant.startDate && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Starts {grant.startDate}</p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right flex flex-col items-end gap-2">
          {grant.amount && (
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{grant.amount}</div>
          )}
          {grant.awardedAmount && !grant.startDate && (
            <a
              href={grant.link || '#'}
              className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              Learn more
            </a>
          )}
          <span className="inline-block rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {grant.status === 'active' ? 'Active' : grant.status === 'completed' ? 'Completed' : 'Upcoming'}
          </span>
        </div>
      </div>

      {/* Tags and Awarded Amount (for compact cards) */}
      {!grant.milestones ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {grant.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${tagColors[tag] || 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}
              >
                {tag}
              </span>
            ))}
          </div>
          {grant.awardedAmount && (
            <div className="rounded-lg bg-slate-100/50 p-3 dark:bg-slate-800/30">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Awarded
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {grant.awardedAmount} (AWARDED)
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Tags */}
          <div className="mb-6 flex flex-wrap gap-2">
            {grant.tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${tagColors[tag] || 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Funding Breakdown */}
          {grant.awardedAmount && grant.unawardedAmount && (
            <div className="mb-6 rounded-lg bg-slate-100/50 p-4 dark:bg-slate-800/30">
              <div className="mb-2 flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Funding Status
                </span>
                <div className="flex gap-4 text-xs font-medium">
                  <span className="text-emerald-600 dark:text-emerald-400">AWARDED {grant.awardedAmount}</span>
                  <span className="text-slate-400 dark:text-slate-500">UNAWARDED {grant.unawardedAmount}</span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                  style={{ width: '65%' }}
                />
              </div>
            </div>
          )}

          {/* Expandable Content */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full"
          >
            <div className="flex items-center justify-between rounded-lg border border-slate-200/50 bg-white/40 px-4 py-3 dark:border-slate-700/30 dark:bg-slate-800/20">
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {expanded ? 'Hide Details' : 'Milestones & Updates'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {grant.milestones ? `${grant.milestones.length} milestones` : 'View details'}
                </p>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-slate-400 transition-transform duration-300 dark:text-slate-500 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {/* Expanded Details */}
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 space-y-4"
            >
              {/* Milestones */}
              {grant.milestones && grant.milestones.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Milestones & Updates
                  </h4>
                  <div className="space-y-2">
                    {grant.milestones.map((milestone, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-lg bg-slate-100/50 p-3 dark:bg-slate-800/30"
                      >
                        <div
                          className={`mt-1 h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                            milestone.completed
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {milestone.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {milestone.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Impact Criteria */}
              {grant.impactCriteria && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Impact Criteria
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {grant.impactCriteria}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default function GrantsPage() {
  return (
    <div className="w-full py-8 pl-4 pr-4 sm:pl-6 sm:pr-6 lg:pl-8 lg:pr-8 xl:pl-12 xl:pr-12">
      <div className="mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Hero Section */}
          <div className="mb-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-1.5 ring-1 ring-cyan-400/30">
              <Heart className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                Grants & Funding
              </span>
            </div>
            <h1 className="mb-2 text-4xl font-bold text-slate-900 dark:text-slate-100">
              EIPsInsight — Grants
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              EIPsInsight gratefully acknowledges funding that keeps this project running. Below are active rounds, awarded grants, and opportunities.
            </p>
          </div>

          {/* Grants Grid */}
          <section className="mb-12 grid gap-6">
            {grants.map((grant, index) => (
              <GrantCard key={grant.id} grant={grant} index={index} />
            ))}
          </section>

          {/* How to Apply Section */}
          <section className="rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white/80 to-slate-50/80 p-8 shadow-sm dark:border-slate-700/30 dark:from-slate-900/40 dark:to-slate-900/20">
            <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">
              How to apply / contribute
            </h2>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
              If you'd like to propose a feature, request funding, or collaborate on data improvements, please open an issue on our GitHub repository or reach out to the team via the contact links in the footer.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://github.com/ethereum/eipsinsight"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Github className="h-4 w-4" />
                Open a GitHub Issue
              </a>
              <a
                href="mailto:contact@eipsinsight.com"
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-4 py-3 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-500/30 dark:text-cyan-300"
              >
                Contact team
              </a>
            </div>
          </section>

          {/* Footer Navigation */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 pt-6 dark:border-slate-700/50">
            <Link href="/" className="text-sm text-cyan-700 hover:underline dark:text-cyan-300">
              ← Back to Home
            </Link>
            <div className="flex flex-wrap gap-4 text-sm">
              <Link
                href="/about"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                About
              </Link>
              <Link
                href="/resources"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Resources
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
