'use client';

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { motion } from 'motion/react';
import { FileText, Layers, BookOpen } from 'lucide-react';
import { CopyLinkButton } from '@/components/header';

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
  { name: 'Idea', description: 'An idea that is pre-draft. This is not tracked within the EIP Repository.', color: 'text-primary' },
  { name: 'Draft', description: 'The first formally tracked stage of an EIP in development.', color: 'text-muted-foreground' },
  { name: 'Review', description: "An EIP Author marks an EIP as ready for and requesting Peer Review.", color: 'text-muted-foreground' },
  { name: 'Last Call', description: 'The final review window for an EIP before moving to Final, typically 14 days.', color: 'text-muted-foreground' },
  { name: 'Final', description: 'The final standard. Should only be updated to correct errata.', color: 'text-muted-foreground' },
  { name: 'Stagnant', description: 'Inactive for 6 months or greater. Can be resurrected by moving back to Draft.', color: 'text-muted-foreground' },
  { name: 'Withdrawn', description: 'Author has withdrawn the proposal. This state has finality.', color: 'text-muted-foreground' },
  { name: 'Living', description: 'Continually updated and not designed to reach finality. Notably EIP-1.', color: 'text-primary' },
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
              {i > 0 && <hr className="my-4 border-border" />}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{type.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  ({type.name === 'Standards Track' ? standardsTrackTotal.toLocaleString() : getCatCount(type.name).toLocaleString()})
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{type.description}</p>
              {'subcategories' in type && type.subcategories && (
                <div className="mt-2 ml-4 space-y-1.5">
                  {type.subcategories.map((sub) => (
                    <div key={sub.name} className="text-sm">
                      <span className="font-medium text-muted-foreground">{sub.name}</span>
                      <span className="ml-1 text-xs tabular-nums text-muted-foreground">
                        ({getCatCount(sub.name).toLocaleString()})
                      </span>
                      <span className="ml-1.5 text-muted-foreground">— {sub.description}</span>
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
              {i > 0 && <hr className="my-3 border-border" />}
              <div className="flex gap-2.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_COLORS[term.name] || 'bg-primary'}`}
                />
                <div>
                  <span className={`text-sm font-semibold ${term.color}`}>{term.name}</span>
                  {term.name !== 'Idea' && (
                    <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                      ({getStatusCount(term.name).toLocaleString()})
                    </span>
                  )}
                  <p className="mt-0.5 text-sm text-muted-foreground">{term.description}</p>
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
        <p className="text-sm leading-relaxed text-muted-foreground">
          First review <Link href="/eip/1" className="text-primary hover:text-primary/80">EIP-1</Link>.
          Then clone the repository and add your EIP. There is a{' '}
          <a
            href="https://github.com/ethereum/EIPs/blob/master/eip-template.md?plain=1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            template EIP here
          </a>
          . Then submit a Pull Request to Ethereum&apos;s{' '}
          <a
            href="https://github.com/ethereum/EIPs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
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
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          {/* Left Sidebar - Sticky */}
          <div className="md:w-1/3 shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4 }}
              className="sticky top-24"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="dec-title persona-title text-xl font-semibold tracking-tight sm:text-2xl">
                    Reference
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    EIP types, status terms, and how to contribute.
                  </p>
                </div>
                <CopyLinkButton sectionId="faqs" className="h-8 w-8 rounded-md" />
              </div>
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
                      className="rounded-lg border border-border bg-card/60 px-4 transition-colors hover:border-primary/40"
                    >
                      <AccordionTrigger className="cursor-pointer items-center py-4 hover:no-underline data-[state=open]:border-b data-[state=open]:border-border data-[state=open]:pb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60">
                            <IconComponent className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-base font-semibold text-foreground">{item.title}</span>
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
