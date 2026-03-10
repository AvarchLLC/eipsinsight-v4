"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Search, X } from "lucide-react";
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

const categoryEyebrows: Record<string, string> = {
  basics: "Get Started",
  process: "Workflow",
  platform: "Platform",
};

const popularQuestionIds = [
  "what-is-eip",
  "draft-to-final",
  "what-is-erc",
  "who-are-editors",
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const isSearching = searchQuery.trim().length > 0;

  const filteredFAQs = useMemo(() => {
    if (!isSearching) return faqs;
    const query = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }, [isSearching, searchQuery]);

  const faqsByCategory = useMemo(() => {
    const grouped: Record<string, typeof faqs> = {
      basics: [],
      process: [],
      platform: [],
    };
    filteredFAQs.forEach((faq) => {
      if (grouped[faq.category]) grouped[faq.category].push(faq);
    });
    return grouped;
  }, [filteredFAQs]);

  const allCountsByCategory = useMemo(() => {
    const grouped: Record<string, number> = {
      basics: 0,
      process: 0,
      platform: 0,
    };
    faqs.forEach((faq) => {
      if (grouped[faq.category] !== undefined) grouped[faq.category] += 1;
    });
    return grouped;
  }, []);

  const popularQuestions = useMemo(
    () => popularQuestionIds.map((id) => faqs.find((faq) => faq.id === id)).filter(Boolean),
    []
  );

  const autoOpenValues = useMemo(() => {
    if (!isSearching) return [];
    return filteredFAQs.map((faq) => faq.id);
  }, [isSearching, filteredFAQs]);

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return [...filteredFAQs].sort((a, b) => {
      const aq = a.question.toLowerCase().indexOf(searchQuery.toLowerCase());
      const bq = b.question.toLowerCase().indexOf(searchQuery.toLowerCase());
      const arank = aq === -1 ? 999 : aq;
      const brank = bq === -1 ? 999 : bq;
      return arank - brank;
    });
  }, [isSearching, filteredFAQs, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/resources"
          className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources
        </Link>

        <header className="mb-6">
          <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            Resources
          </span>
          <h1 className="mt-3 dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Quick answers about EIPs, governance, and how EIPsInsight works.
          </p>
        </header>

        <div className="mt-2 rounded-xl border border-border bg-card/60 p-4 backdrop-blur-sm">
          <div className="relative max-w-3xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions, process, or platform topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-muted/60 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() =>
                  document
                    .getElementById(`faq-${key}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-foreground transition-colors hover:border-primary/30 hover:bg-primary/10"
              >
                {label} ({allCountsByCategory[key]})
              </button>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Popular Questions
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {popularQuestions.map((faq) => (
                <button
                  key={faq!.id}
                  onClick={() =>
                    document
                      .getElementById(`faq-item-${faq!.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                  className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  {faq!.question}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 max-w-5xl">
          {isSearching ? (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search Results</p>
                  <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    Found {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Direct-answer mode shows all matches in one list so you can find answers faster.
                  </p>
                </div>
              </div>

              {searchResults.length > 0 ? (
                <Accordion type="multiple" value={autoOpenValues} className="space-y-3">
                  {searchResults.map((faq) => (
                    <AccordionItem
                      key={faq.id}
                      value={faq.id}
                      id={`faq-item-${faq.id}`}
                      className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm"
                    >
                      <AccordionTrigger className="px-5 py-4 text-left transition-colors hover:bg-muted/40 data-[state=open]:bg-muted/40">
                        <div className="pr-4 text-left">
                          <span className="block text-base font-semibold text-foreground">{faq.question}</span>
                          <span className="mt-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {categoryLabels[faq.category]}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-4 pt-1">
                        <p className="text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                        {faq.relatedLinks?.length ? (
                          <div className="mt-4 border-t border-border pt-4">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Related links
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {faq.relatedLinks.map((link) => (
                                <Link
                                  key={link.href}
                                  href={link.href}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-primary transition-colors hover:border-primary/30 hover:bg-primary/10"
                                >
                                  {link.label}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="rounded-xl border border-border bg-card/60 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No FAQs found matching your search.
                  </p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-3 inline-flex h-8 items-center rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </section>
          ) : (
            <div className="space-y-10">
              {Object.entries(faqsByCategory).map(([category, categoryFAQs]) => {
                if (categoryFAQs.length === 0) return null;

                return (
                  <section key={category} id={`faq-${category}`} className="scroll-mt-28">
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {categoryEyebrows[category]}
                      </p>
                      <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        {categoryLabels[category]} ({categoryFAQs.length})
                      </h2>
                    </div>

                    <Accordion type="multiple" className="space-y-3">
                      {categoryFAQs.map((faq) => (
                        <AccordionItem
                          key={faq.id}
                          value={faq.id}
                          id={`faq-item-${faq.id}`}
                          className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm"
                        >
                          <AccordionTrigger className="px-5 py-4 text-left transition-colors hover:bg-muted/40 data-[state=open]:bg-muted/40">
                            <span className="pr-4 text-base font-semibold text-foreground">
                              {faq.question}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="px-5 pb-4 pt-1">
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {faq.answer}
                            </p>
                            {faq.relatedLinks?.length ? (
                              <div className="mt-4 border-t border-border pt-4">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Related links
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {faq.relatedLinks.map((link) => (
                                    <Link
                                      key={link.href}
                                      href={link.href}
                                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-primary transition-colors hover:border-primary/30 hover:bg-primary/10"
                                    >
                                      {link.label}
                                      <ExternalLink className="h-3 w-3" />
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                );
              })}
            </div>
          )}

          <div className="mt-12 rounded-xl border border-border bg-card/60 p-6 text-center backdrop-blur-sm">
            <p className="text-sm text-muted-foreground">
              Did not find your answer? Try a deeper resource path.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="https://github.com/AvarchLLC/eipsinsight-v4/issues"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                Ask on GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/resources/docs"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                Read the Docs
              </Link>
              <Link
                href="/resources/videos"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                Browse Videos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
