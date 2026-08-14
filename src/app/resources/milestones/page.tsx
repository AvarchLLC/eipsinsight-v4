"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileCode,
  Flame,
  Globe,
  Layers,
  Milestone as MilestoneIcon,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  MilestoneTimeline,
} from "@/components/resources/MilestoneTimeline";
import {
  MilestoneYearSelector,
} from "@/components/resources/MilestoneYearSelector";
import {
  CATEGORIES,
  GLOSSARY,
  MILESTONES_DATA,
  YEARS,
  YEAR_CONCLUSIONS,
  type MilestoneCategory,
} from "@/data/resources/milestones";
import { cn } from "@/lib/utils";

const categoryIconMap = {
  all: Layers,
  upgrades: Flame,
  standards: FileCode,
  governance: ShieldCheck,
  ux: Zap,
};

export default function MilestonesPage() {
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedCategory, setSelectedCategory] = useState<MilestoneCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Milestone counts per year
  const milestoneCountsByYear = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const year of YEARS) {
      counts[year] = MILESTONES_DATA.filter((m) => m.year === year).length;
    }
    return counts;
  }, []);

  // Filtered milestones for selected year & search query & category
  const filteredMilestones = useMemo(() => {
    return MILESTONES_DATA.filter((milestone) => {
      // Year filter
      if (selectedYear !== "all" && milestone.year !== selectedYear) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "all" && milestone.category !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = milestone.title.toLowerCase().includes(query);
        const matchesDesc = milestone.description.toLowerCase().includes(query);
        const matchesWhy = milestone.whyItMatters.toLowerCase().includes(query);
        const matchesTerms = milestone.terms.some((t) => t.toLowerCase().includes(query));
        const matchesEIPs = milestone.eips?.some(
          (e) => e.number.includes(query) || (e.title && e.title.toLowerCase().includes(query))
        );
        const matchesDate = milestone.date.toLowerCase().includes(query);

        return (
          matchesTitle ||
          matchesDesc ||
          matchesWhy ||
          matchesTerms ||
          matchesEIPs ||
          matchesDate
        );
      }
      return true;
    });
  }, [selectedYear, selectedCategory, searchQuery]);

  const conclusions = useMemo(
    () => YEAR_CONCLUSIONS[selectedYear] ?? [],
    [selectedYear]
  );

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Hero Header Section */}
      <section className="relative overflow-hidden border-b border-border/80 bg-gradient-to-b from-card via-card/80 to-background/50 py-10 md:py-14">
        {/* Background Ambient Glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/15" />
          <div className="absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/15" />
        </div>

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/resources"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources Hub
          </Link>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <MilestoneIcon className="h-3.5 w-3.5" />
                Ethereum Standards & Protocol Roadmap
              </div>

              <h1 className="dec-title persona-title text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Ethereum Governance & Technical Milestones
              </h1>

              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                A comprehensive historical timeline tracking protocol hard forks, core EIPs/ERCs, account abstraction upgrades, and governance evolutions shaping Ethereum from 2015 to 2026.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-2">
                <Link
                  href="/upgrade"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                >
                  <Flame className="h-3.5 w-3.5" />
                  Network Upgrades Hub
                </Link>
                <Link
                  href="/upgrade/schedule"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Fork Schedule
                </Link>
                <Link
                  href="/analytics/eips"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                >
                  <FileCode className="h-3.5 w-3.5" />
                  EIP Analytics
                </Link>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 lg:gap-3">
              <div className="rounded-xl border border-border/80 bg-card/90 p-3.5 shadow-xs backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Eras Covered
                </p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">
                  2015–2026
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  11+ years of protocol evolution
                </p>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 shadow-xs backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Tracked Upgrades
                </p>
                <p className="mt-1 text-2xl font-extrabold text-primary">
                  25+ Upgrades
                </p>
                <p className="mt-0.5 text-[11px] text-primary/80">
                  Frontier to Fusaka
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card/90 p-3.5 shadow-xs backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Key Focus
                </p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">
                  Blob & PeerDAS
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Data availability scaling
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card/90 p-3.5 shadow-xs backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Account UX
                </p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">
                  EIP-7702 & AA
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Smart EOA capabilities
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="container mx-auto space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Controls Bar: Year Selector & Search & Categories */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-md sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Year Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Select Ecosystem Era / Year
                </h2>
              </div>
              <MilestoneYearSelector
                years={YEARS}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                milestoneCounts={milestoneCountsByYear}
              />
            </div>

            {/* Live Search Input */}
            <div className="relative min-w-[260px] lg:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search EIP, Upgrade, or Keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border/80 bg-background/80 py-2 pl-9 pr-8 text-xs font-medium text-foreground placeholder-muted-foreground shadow-xs backdrop-blur-xs transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
              Filter:
            </span>
            {CATEGORIES.map((cat) => {
              const IconComp = categoryIconMap[cat.id] || Layers;
              const isActive = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "border-primary/50 bg-primary/15 text-primary shadow-2xs"
                      : "border-border/70 bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <IconComp className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected Year Highlights & Takeaways */}
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 shadow-xs lg:col-span-2">
            <div className="flex items-center justify-between gap-2 border-b border-primary/20 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                  {selectedYear === "2015-2019" ? "2015–2019 Era Highlights" : `${selectedYear} Yearly Takeaways`}
                </h3>
              </div>
              <span className="rounded-full border border-primary/40 bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                {filteredMilestones.length} Milestones
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {conclusions.map((point) => (
                <div
                  key={point.lead}
                  className="rounded-xl border border-primary/20 bg-background/60 p-3 shadow-2xs backdrop-blur-xs"
                >
                  <p className="text-xs font-bold text-foreground">
                    {point.lead}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {point.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Context Card */}
          <div className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-xs backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Globe className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Era Overview
              </h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {selectedYear === "2026" &&
                "The 2026 roadmap focuses on PeerDAS blob sampling, Enshrined Proposer-Builder Separation (ePBS), and standardized cross-rollup intents."}
              {selectedYear === "2025" &&
                "2025 marked the Pectra upgrade activation, introducing EIP-7702 for EOAs and MaxEB validator balance consolidations."}
              {selectedYear === "2024" &&
                "2024 delivered the Dencun upgrade with EIP-4844 blobs, slashing L2 rollup transaction fees by over 90% across Ethereum."}
              {selectedYear === "2023" &&
                "2023 brought Shapella validator withdrawals and the mainnet launch of ERC-4337 Account Abstraction EntryPoint."}
              {selectedYear === "2022" &&
                "2022 executed The Merge, transitioning Ethereum to Proof-of-Stake and reducing network energy usage by 99.95%."}
              {selectedYear === "2021" &&
                "2021 activated EIP-1559 in the London upgrade, burning transaction fees and introducing base fee dynamics."}
              {selectedYear === "2020" &&
                "2020 launched the Beacon Chain Phase 0 Genesis, starting the multi-year PoS transition."}
              {selectedYear === "2015-2019" &&
                "The foundational era established Ethereum smart contracts, ERC-20/721 token standards, and EVM opcodes."}
            </p>
          </div>
        </section>

        {/* Timeline Section */}
        <section className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-md sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground sm:text-xl">
                Milestone Timeline ({selectedYear === "2015-2019" ? "2015–2019" : selectedYear})
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Showing {filteredMilestones.length} milestone{filteredMilestones.length === 1 ? "" : "s"} matching your filters
              </p>
            </div>

            {(selectedCategory !== "all" || searchQuery !== "") && (
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                Clear Filters
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <MilestoneTimeline
            milestones={filteredMilestones}
            selectedYear={selectedYear}
          />
        </section>

        {/* Glossary & Key Terminology Section */}
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-xs backdrop-blur-md sm:p-6">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Ethereum Technical Terms & Glossary
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GLOSSARY.map((entry) => (
              <div
                key={entry.term}
                className="rounded-xl border border-border/70 bg-muted/30 p-3.5 transition-colors hover:border-primary/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {entry.term}
                  </p>
                  {entry.category && (
                    <span className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {entry.category}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {entry.meaning}
                </p>
                {entry.link && (
                  <Link
                    href={entry.link}
                    className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    View EIP Specification →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
