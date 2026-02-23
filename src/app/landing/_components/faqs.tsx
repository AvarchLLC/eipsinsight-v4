'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Github, Database, Users, Tag, Bug } from 'lucide-react';

type FAQItem = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  question: string;
  answer: React.ReactNode;
};

export default function FAQs() {
  const faqItems: FAQItem[] = [
    {
      id: 'item-1',
      icon: Database,
      question: 'Where does the data come from?',
      answer: (
        <>
          We aggregate public GitHub data from the official Ethereum repositories (EIPs, ERCs, RIPs), partner repositories, and community submissions. We fetch commits, PRs, and proposal files using GitHub&apos;s API, normalize labels and timestamps into monthly buckets, and persist processed records in MongoDB. Public API endpoints (for example, /api/stats and PR snapshot APIs) expose the aggregated metrics; when the database is unavailable the UI shows a friendly fallback.
        </>
      ),
    },
    {
      id: 'item-2',
      icon: Users,
      question: 'How can I contribute?',
      answer: (
        <>
          We welcome contributions from developers, researchers, and community members at all skill levels. You can contribute by opening issues or pull requests in our GitHub repository at{' '}
          <a
            href="https://github.com/AvarchLLC/EIPsInsight"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 underline transition-colors"
          >
            github.com/AvarchLLC/EIPsInsight
          </a>
          . Start with smaller tasks like documentation fixes, typo corrections, UI improvements, or feature suggestions. For larger changes such as new analytics features, API enhancements, or architectural modifications, please open an issue first to discuss scope, design approach, and implementation details with our maintainers. We also appreciate feedback on data accuracy, user experience suggestions, and reports of any inconsistencies you notice in our charts or dashboards.
        </>
      ),
    },
    {
      id: 'item-3',
      icon: Tag,
      question: 'What do the labels and statuses mean?',
      answer: (
        <>
          EIPsInsight uses two types of label systems for comprehensive analysis. &apos;CustomLabels&apos; are our normalized categories designed for analytics clarity, including labels like &apos;e-review&apos; (editorial review), &apos;e-consensus&apos; (awaiting consensus), &apos;a-review&apos; (author review), &apos;stagnant&apos; (inactive proposals), and &apos;miscellaneous&apos; for edge cases. &apos;GitHubLabels&apos; represent the raw workflow labels from the official repositories. EIP statuses follow the standard lifecycle: Draft (initial submission), Review (community feedback phase), Last Call (final review period), Final (accepted and implemented), Stagnant (inactive for 6+ months), and Withdrawn (author-cancelled). Our visualizations map these statuses to color-coded charts and provide detailed tooltips explaining each stage of the proposal lifecycle.
        </>
      ),
    },
    {
      id: 'item-4',
      icon: Bug,
      question: 'How do I report a bug or request a feature?',
      answer: (
        <>
          To report bugs or request new features, please visit our GitHub repository at{' '}
          <a
            href="https://github.com/AvarchLLC/EIPsInsight"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 underline transition-colors"
          >
            github.com/AvarchLLC/EIPsInsight
          </a>
          {' '}and create a detailed issue. For bug reports, include specific reproduction steps, screenshots or screen recordings, your browser/device information, expected vs actual behavior, and any console errors you encounter. For feature requests, describe your use case clearly, explain how the feature would benefit the Ethereum community, provide mockups or examples if applicable, and specify any particular data sources or API integrations needed. Our maintainers actively triage issues, typically responding within 48-72 hours with questions, suggestions, or implementation timelines. Priority is given to issues affecting data accuracy, accessibility improvements, and features that enhance community understanding of EIP processes.
        </>
      ),
    },
  ];

  return (
    <section className="relative w-full bg-slate-100/40 py-16 sm:py-20 dark:bg-slate-950/30" id="faqs">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:gap-16">
          {/* Left Sidebar - Sticky */}
          <div className="md:w-1/3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
              className="sticky top-24"
            >
              <h2 className="dec-title text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-200 sm:text-2xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-500">
                Get answers to common questions about our platform and services.
              </p>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-500">
                Can&apos;t find what you&apos;re looking for? Visit our{' '}
                <a
                  href="https://github.com/AvarchLLC/EIPsInsight"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400 font-medium hover:text-cyan-800 dark:hover:text-cyan-300 transition-colors underline"
                >
                  <Github className="h-3.5 w-3.5" />
                  GitHub repository
                </a>
                {' '}to open an issue or start a discussion.
              </p>
            </motion.div>
          </div>

          {/* Right Side - Accordion */}
          <div className="md:w-2/3">
            <Accordion
              type="single"
              collapsible
              className="w-full space-y-3"
            >
              {faqItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <AccordionItem
                      value={item.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-700/50 bg-gradient-to-br from-white via-slate-50 to-white dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/60 backdrop-blur-sm px-4 shadow-sm last:border-b"
                    >
                      <AccordionTrigger className="cursor-pointer items-center py-5 hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-cyan-400/30 bg-cyan-500/10">
                            <IconComponent className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
                          </div>
                          <span className="text-base font-semibold text-slate-800 dark:text-slate-200">{item.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-5">
                        <div className="pl-9">
                          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                            {item.answer}
                          </p>
                        </div>
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
