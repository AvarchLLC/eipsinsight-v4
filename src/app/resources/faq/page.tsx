"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, ExternalLink, ArrowLeft } from "lucide-react";
import { faqs } from "@/data/resources/faqs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const categoryLabels: Record<string, string> = {
  basics: "Basics",
  process: "Process",
  platform: "Platform",
};

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter FAQs based on search
  const filteredFAQs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const query = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group FAQs by category
  const faqsByCategory = useMemo(() => {
    const grouped: Record<string, typeof faqs> = {
      basics: [],
      process: [],
      platform: [],
    };
    filteredFAQs.forEach((faq) => {
      if (grouped[faq.category]) {
        grouped[faq.category].push(faq);
      }
    });
    return grouped;
  }, [filteredFAQs]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <section className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Link>
          <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl mb-4">
            Frequently Asked Questions
          </h1>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 text-sm bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Results count */}
        {searchQuery && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Found {filteredFAQs.length} result{filteredFAQs.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
          </p>
        )}

        {/* FAQ Sections */}
        <div className="space-y-8">
          {Object.entries(faqsByCategory).map(([category, categoryFAQs]) => {
            if (categoryFAQs.length === 0) return null;

            return (
              <section key={category}>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-cyan-400" />
                  {categoryLabels[category]}
                </h2>

                <Accordion type="multiple" className="space-y-3">
                  {categoryFAQs.map((faq) => (
                    <AccordionItem
                      key={faq.id}
                      value={faq.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden"
                    >
                      <AccordionTrigger className="px-6 py-4 text-left hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors [&[data-state=open]]:bg-slate-100 dark:bg-slate-800/50">
                        <span className="text-base font-medium text-slate-900 dark:text-white pr-4">
                          {faq.question}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-2">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                          {faq.answer}
                        </p>
                        {faq.relatedLinks && faq.relatedLinks.length > 0 && (
                          <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4 mt-4">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                              Related links:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {faq.relatedLinks.map((link) => (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  className="inline-flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                                >
                                  {link.label}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            );
          })}
        </div>

        {filteredFAQs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              No FAQs found matching your search.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Help Footer */}
        <div className="mt-12 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 p-6 backdrop-blur-sm text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Can&apos;t find what you&apos;re looking for?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="https://github.com/AvarchLLC/EIPsInsight/issues"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
            >
              Ask on GitHub
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <span className="text-slate-600">•</span>
            <Link
              href="/resources/docs"
              className="inline-flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
