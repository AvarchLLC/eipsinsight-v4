'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { motion } from 'motion/react';
import { FileText, Layers, BookOpen } from 'lucide-react';

const TYPE_INFO = [
  {
    name: 'Standards Track',
    description: 'Changes affecting most or all Ethereum implementations.',
    subcategories: [
      { name: 'Core', description: 'Consensus fork improvements and core dev discussions.' },
      { name: 'Networking', description: 'devp2p and Light Ethereum Subprotocol.' },
      { name: 'Interface', description: 'Client API/RPC specifications and standards.' },
      { name: 'ERC', description: 'Application-level standards: tokens, registries, account abstraction.' },
    ],
  },
  { name: 'Meta', description: 'Process proposals for areas other than the protocol itself.' },
  { name: 'Informational', description: 'General guidelines or information for the community.' },
];

const STATUS_TERMS = [
  { name: 'Idea', description: 'An idea that is pre-draft. This is not tracked within the EIP Repository.', color: 'text-purple-600 dark:text-purple-300' },
  { name: 'Draft', description: 'The first formally tracked stage of an EIP in development.', color: 'text-slate-600 dark:text-slate-300' },
  { name: 'Review', description: "An EIP Author marks an EIP as ready for and requesting Peer Review.", color: 'text-amber-600 dark:text-amber-300' },
  { name: 'Last Call', description: 'The final review window for an EIP before moving to Final, typically 14 days.', color: 'text-orange-600 dark:text-orange-300' },
  { name: 'Final', description: 'The final standard. Should only be updated to correct errata.', color: 'text-emerald-600 dark:text-emerald-300' },
  { name: 'Stagnant', description: 'Inactive for 6 months or greater. Can be resurrected by moving back to Draft.', color: 'text-gray-600 dark:text-gray-400' },
  { name: 'Withdrawn', description: 'Author has withdrawn the proposal. This state has finality.', color: 'text-red-600 dark:text-red-300' },
  { name: 'Living', description: 'Continually updated and not designed to reach finality. Notably EIP-1.', color: 'text-cyan-600 dark:text-cyan-300' },
];

const STATUS_DOT_COLORS: Record<string, string> = {
  Draft: 'bg-slate-400', Review: 'bg-amber-400', 'Last Call': 'bg-orange-400', Final: 'bg-emerald-400',
  Stagnant: 'bg-gray-500', Withdrawn: 'bg-red-400', Living: 'bg-cyan-400',
};

type HomeFAQsProps = {
  categoryBreakdown: Array<{ category: string; count: number }>;
  statusDist: Array<{ status: string; count: number }>;
};

export default function HomeFAQs({ categoryBreakdown, statusDist }: HomeFAQsProps) {
  const getCatCount = (name: string) =>
    categoryBreakdown.find((c) => c.category.toLowerCase() === name.toLowerCase())?.count ?? 0;
  const standardsTrackTotal = categoryBreakdown
    .filter((c) => ['core', 'networking', 'interface', 'erc'].includes(c.category.toLowerCase()))
    .reduce((s, c) => s + c.count, 0);
  const getStatusCount = (name: string) =>
    statusDist.find((d) => d.status === name)?.count ?? 0;

  const items = [
    {
      id: 'eip-types',
      icon: Layers,
      title: 'EIP Types',
      content: (
        <div className="space-y-0">
          {TYPE_INFO.map((type, i) => (
            <div key={type.name}>
              {i > 0 && <hr className="border-slate-200 dark:border-slate-700/40 my-4" />}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{type.name}</span>
                <span className="text-xs tabular-nums text-slate-600 dark:text-slate-500">
                  ({type.name === 'Standards Track' ? standardsTrackTotal.toLocaleString() : getCatCount(type.name).toLocaleString()})
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-500">{type.description}</p>
              {'subcategories' in type && type.subcategories && (
                <div className="mt-2 ml-4 space-y-1.5">
                  {type.subcategories.map((sub) => (
                    <div key={sub.name} className="text-sm">
                      <span className="font-medium text-slate-600 dark:text-slate-400">{sub.name}</span>
                      <span className="ml-1 text-xs tabular-nums text-slate-600">
                        ({getCatCount(sub.name).toLocaleString()})
                      </span>
                      <span className="ml-1.5 text-slate-500">— {sub.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'status-terms',
      icon: FileText,
      title: 'Status Terms',
      content: (
        <div className="space-y-0">
          {STATUS_TERMS.map((term, i) => (
            <div key={term.name}>
              {i > 0 && <hr className="border-slate-200 dark:border-slate-700/40 my-3" />}
              <div className="flex gap-2.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLORS[term.name] || 'bg-purple-400'}`}
                />
                <div>
                  <span className={`text-sm font-semibold ${term.color}`}>{term.name}</span>
                  {term.name !== 'Idea' && (
                    <span className="ml-1.5 text-xs tabular-nums text-slate-600">
                      ({getStatusCount(term.name).toLocaleString()})
                    </span>
                  )}
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-500">{term.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'contributing',
      icon: BookOpen,
      title: 'Contributing',
        content: (
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          First review <Link href="/eip/1" className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300">EIP-1</Link>.
          Then clone the repository and add your EIP. There is a{' '}
          <a
            href="https://github.com/ethereum/EIPs/blob/master/eip-template.md?plain=1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
          >
            template EIP here
          </a>
          . Then submit a Pull Request to Ethereum&apos;s{' '}
          <a
            href="https://github.com/ethereum/EIPs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
          >
            EIPs repository
          </a>
          .
        </p>
      ),
    },
  ];

  return (
    <section className="relative w-full py-10 sm:py-14" id="faqs">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex flex-col gap-8 md:flex-row md:gap-14">
          {/* Left Sidebar - Sticky */}
          <div className="md:w-1/3 shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4 }}
              className="sticky top-24"
            >
              <h2 className="dec-title text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-200 sm:text-2xl">
                Reference
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                EIP types, status terms, and how to contribute.
              </p>
            </motion.div>
          </div>

          {/* Right Side - Accordion */}
          <div className="md:min-w-0 md:flex-1">
            <Accordion type="single" collapsible defaultValue="eip-types" className="w-full space-y-2">
              {items.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.25, delay: index * 0.08 }}
                  >
                    <AccordionItem
                      value={item.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-700/50 bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/60 px-4 shadow-sm transition-colors hover:border-slate-300 dark:hover:border-slate-700/60"
                    >
                      <AccordionTrigger className="cursor-pointer items-center py-4 hover:no-underline data-[state=open]:border-b data-[state=open]:border-slate-200 dark:data-[state=open]:border-slate-700/40 data-[state=open]:pb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600/50 bg-slate-100 dark:bg-slate-800/50">
                            <IconComponent className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                          </div>
                          <span className="text-base font-semibold text-slate-800 dark:text-slate-200">{item.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 pt-0">
                        <div className="pl-10">{item.content}</div>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                );
              })}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
