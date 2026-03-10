"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Milestone as MilestoneIcon } from "lucide-react";
import {
  MilestoneTimeline,
} from "@/components/resources/MilestoneTimeline";
import {
  MilestoneYearSelector,
} from "@/components/resources/MilestoneYearSelector";
import type { Milestone } from "@/components/resources/MilestoneCard";

const milestonesByYear: Record<string, Milestone[]> = {
  "2025": [
    {
      title: "Interop Upgrade Coordination",
      date: "January 2025",
      description:
        "Core contributors aligned cross-client priorities for interoperability and governance reporting.",
      whyItMatters:
        "Better interop reduces implementation mismatches and lowers risk during multi-client network upgrades.",
      takeaway:
        "Governance quality is tightly linked to coordination quality across clients.",
      image: "/upgrade/eip-incl.png",
      terms: ["interoperability", "client teams", "upgrade readiness"],
    },
    {
      title: "Governance Process Retrospective Published",
      date: "April 2025",
      description:
        "A retrospective captured review-cycle bottlenecks and proposed editor workflow improvements.",
      whyItMatters:
        "Retrospectives turn historical friction into process improvements that compound over time.",
      takeaway:
        "Continuous governance improvement is as important as technical innovation.",
      image: "/globe.svg",
      terms: ["retrospective", "editor workflow", "review latency"],
    },
    {
      title: "Standards Working Sessions Expanded",
      date: "September 2025",
      description:
        "Community calls expanded to include focused standards tracks for protocol, execution, and tooling.",
      whyItMatters:
        "Focused tracks improve signal-to-noise and help proposals move forward with clearer ownership.",
      takeaway:
        "Specialized governance tracks can accelerate decisions without sacrificing open participation.",
      image: "/eipsinsight.png",
      terms: ["working sessions", "proposal tracks", "governance bandwidth"],
    },
  ],
  "2024": [
    {
      title: "Cancun Upgrade Finalized",
      date: "March 2024",
      description:
        "Finalization of the Cancun upgrade including proto-danksharding and broader ecosystem readiness.",
      whyItMatters:
        "Cancun translated years of roadmap design into production-level scaling primitives.",
      takeaway:
        "Large upgrades succeed when protocol design and client execution remain tightly synchronized.",
      image: "/upgrade/ethupgradetimeline.png",
      terms: ["Cancun", "proto-danksharding", "mainnet readiness"],
    },
    {
      title: "EIP-4844 Adopted",
      date: "March 2024",
      description:
        "Blob transactions were introduced to improve data availability and reduce rollup data costs.",
      whyItMatters:
        "Blob space gives rollups a cheaper data path, directly improving user transaction costs.",
      takeaway:
        "EIP-4844 is a critical bridge to future data-scaling upgrades.",
      image: "/upgrade/eip-incl.png",
      terms: ["EIP-4844", "blob transactions", "rollups"],
    },
    {
      title: "Editor Throughput Dashboard Launched",
      date: "July 2024",
      description:
        "Governance participants gained clearer visibility into proposal throughput, backlog, and review velocity.",
      whyItMatters:
        "Observable governance metrics make bottlenecks visible early, before they become systemic delays.",
      takeaway:
        "Measurement improves accountability across proposal lifecycle stages.",
      image: "/eipsinsight.png",
      terms: ["throughput", "backlog", "review velocity"],
    },
  ],
  "2023": [
    {
      title: "AllCoreDevs Process Refresh",
      date: "February 2023",
      description:
        "Governance cadence was refined to separate strategic roadmap calls from implementation-focused meetings.",
      whyItMatters:
        "Separating strategic and operational discussions reduces context switching for core maintainers.",
      takeaway:
        "Meeting design has direct impact on protocol decision quality.",
      image: "/globe.svg",
      terms: ["AllCoreDevs", "roadmap cadence", "implementation sync"],
    },
    {
      title: "Account Abstraction Momentum",
      date: "May 2023",
      description:
        "EIP-4337 adoption accelerated and drove governance discussion on wallet UX and infra readiness.",
      whyItMatters:
        "Account abstraction enables safer, more flexible wallet experiences for mainstream users.",
      takeaway:
        "User experience improvements can become first-class governance priorities.",
      image: "/upgrade/eip-incl.png",
      terms: ["EIP-4337", "account abstraction", "wallet UX"],
    },
    {
      title: "Dencun Scope Locked",
      date: "November 2023",
      description:
        "Major client teams aligned on scope and timing, creating a stable governance target for 2024 delivery.",
      whyItMatters:
        "Scope lock gives contributors a predictable execution target and lowers late-stage churn.",
      takeaway:
        "Clear scope boundaries are a major predictor of reliable upgrade delivery.",
      image: "/upgrade/ethupgradetimeline.png",
      terms: ["Dencun", "scope lock", "delivery planning"],
    },
  ],
  "2022": [
    {
      title: "The Merge Completed",
      date: "September 2022",
      description:
        "Ethereum transitioned to proof-of-stake, marking a major governance and coordination milestone.",
      whyItMatters:
        "The Merge changed Ethereum's consensus model without interrupting chain continuity.",
      takeaway:
        "Ethereum can execute high-complexity migrations with broad ecosystem coordination.",
      image: "/upgrade/ethupgradetimeline.png",
      terms: ["The Merge", "proof-of-stake", "consensus transition"],
    },
    {
      title: "Post-Merge EIP Prioritization",
      date: "October 2022",
      description:
        "Contributors re-prioritized standards work around scalability, validator ergonomics, and roadmap sequencing.",
      whyItMatters:
        "Post-Merge reprioritization ensured governance momentum continued rather than fragmenting.",
      takeaway:
        "Roadmap sequencing is a governance function, not just an engineering concern.",
      image: "/eipsinsight.png",
      terms: ["validator ergonomics", "roadmap sequencing", "scalability"],
    },
  ],
  "2021": [
    {
      title: "London Upgrade Activated",
      date: "August 2021",
      description:
        "EIP-1559 fee market changes established a new economic baseline for Ethereum governance discussions.",
      whyItMatters:
        "EIP-1559 changed fee dynamics and clarified how protocol economics affect users and builders.",
      takeaway:
        "Economic design decisions can reshape the long-term governance agenda.",
      image: "/upgrade/ethupgradetimeline.png",
      terms: ["EIP-1559", "base fee", "fee market"],
    },
    {
      title: "Community Governance Workshops",
      date: "December 2021",
      description:
        "Structured workshops improved participation and documentation quality across standards discussions.",
      whyItMatters:
        "Better documentation and inclusive dialogue improve proposal quality before formal review stages.",
      takeaway:
        "Early community alignment reduces downstream governance friction.",
      image: "/globe.svg",
      terms: ["governance workshops", "proposal quality", "community alignment"],
    },
  ],
  "2020": [
    {
      title: "Governance Documentation Consolidated",
      date: "March 2020",
      description:
        "Key process documentation was consolidated, improving discoverability for proposal authors and reviewers.",
      whyItMatters:
        "Clear process docs lower entry barriers for new contributors and reduce review ambiguity.",
      takeaway:
        "Documentation is foundational governance infrastructure.",
      image: "/file.svg",
      terms: ["process docs", "proposal authors", "review clarity"],
    },
    {
      title: "Cross-Team Review Rituals Introduced",
      date: "October 2020",
      description:
        "Regular cross-team review rituals improved consistency in standards triage and proposal feedback loops.",
      whyItMatters:
        "Cross-team rituals prevent isolated decisions and improve shared protocol context.",
      takeaway:
        "Stable review rituals create healthier governance throughput.",
      image: "/globe.svg",
      terms: ["triage", "feedback loops", "cross-team review"],
    },
  ],
};

const yearConclusions: Record<string, Array<{ lead: string; detail: string }>> = {
  "2025": [
    { lead: "Coordination discipline", detail: "became a top-level governance priority." },
    { lead: "Process retrospectives", detail: "moved from optional to operationally necessary." },
    { lead: "Specialized working tracks", detail: "improved decision quality and pace." },
  ],
  "2024": [
    { lead: "Execution and scaling", detail: "moved from roadmap intent to deployed capability." },
    { lead: "EIP-4844", detail: "became a practical foundation for cheaper rollup usage." },
    { lead: "Governance observability", detail: "improved through measurable editor workflows." },
  ],
  "2023": [
    { lead: "Cadence design", detail: "and scope-setting directly improved delivery confidence." },
    { lead: "Account abstraction", detail: "shifted governance focus toward user-facing outcomes." },
    { lead: "Dencun scoping", detail: "reduced uncertainty ahead of major release execution." },
  ],
  "2022": [
    { lead: "The Merge", detail: "proved Ethereum can execute a high-stakes consensus transition." },
    { lead: "Post-Merge prioritization", detail: "kept the roadmap coherent and actionable." },
  ],
  "2021": [
    { lead: "EIP-1559", detail: "changed governance discussions around protocol economics." },
    { lead: "Workshops and docs", detail: "improved contributor onboarding and review quality." },
  ],
  "2020": [
    { lead: "Documentation consolidation", detail: "lowered governance entry barriers." },
    { lead: "Cross-team rituals", detail: "established durable review norms." },
  ],
};

const glossary = [
  {
    term: "Proto-danksharding",
    meaning:
      "An intermediate data-scaling design that introduces blobs before full danksharding.",
  },
  {
    term: "Blob transactions",
    meaning:
      "A transaction format carrying temporary data for rollups, optimized for lower cost.",
  },
  {
    term: "AllCoreDevs",
    meaning:
      "Regular calls where Ethereum client teams coordinate upgrade scope, timing, and risks.",
  },
  {
    term: "Account abstraction",
    meaning:
      "A model where wallet behavior can be programmed with advanced security and UX logic.",
  },
  {
    term: "Triage",
    meaning:
      "A prioritization process to categorize proposals by urgency, readiness, and impact.",
  },
];

const years = ["2020", "2021", "2022", "2023", "2024", "2025"];

export default function MilestonesPage() {
  const [selectedYear, setSelectedYear] = useState("2024");

  const milestones = useMemo(
    () => milestonesByYear[selectedYear] ?? [],
    [selectedYear]
  );
  const conclusions = useMemo(
    () => yearConclusions[selectedYear] ?? [],
    [selectedYear]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/15" />
          <div className="absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/15" />
        </div>

        <div className="container relative mx-auto px-4 py-10 md:py-14">
          <Link
            href="/resources"
            className="mb-5 inline-flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Resources
          </Link>

          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2">
              <MilestoneIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
            </div>
            <div className="max-w-3xl">
              <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 bg-clip-text text-3xl font-semibold tracking-tight text-transparent dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 sm:text-4xl">
                Ethereum Governance Milestones
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
                Key events and governance milestones across Ethereum standards development.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto space-y-6 px-4 py-10 md:py-12">
        <section className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/50 sm:p-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200/70 bg-slate-100/70 p-4 dark:border-slate-700/60 dark:bg-slate-900/70 lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Overview: Why This Timeline Matters
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              This page summarizes how Ethereum governance evolved from process stabilization to large-scale execution.
              Focus on the <strong className="text-slate-900 dark:text-slate-100">bolded conclusions</strong> for each year,
              then use each milestone&apos;s <strong className="text-slate-900 dark:text-slate-100">Why it matters</strong> and
              <strong className="text-slate-900 dark:text-slate-100"> Key takeaway</strong> to understand broader impact.
            </p>
          </div>

          <div className="rounded-xl border border-cyan-300/35 bg-cyan-500/10 p-4 dark:border-cyan-500/35 dark:bg-cyan-500/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-300">
              Selected Year
            </p>
            <p className="mt-1 text-2xl font-semibold text-cyan-900 dark:text-cyan-100">{selectedYear}</p>
            <p className="mt-2 text-xs leading-relaxed text-cyan-800/90 dark:text-cyan-200/90">
              Timeline entries for this year emphasize governance execution, process maturity, and ecosystem-level meaning.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/40 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Timeline Selector
            </h2>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
              {selectedYear}
            </span>
          </div>

          <MilestoneYearSelector
            years={years}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-emerald-300/35 bg-emerald-500/10 p-4 dark:border-emerald-500/35 dark:bg-emerald-500/10">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
                Yearly Conclusions
              </h3>
              <div className="mt-3 space-y-2">
                {conclusions.map((point) => (
                  <p key={point.lead} className="text-sm leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
                    <strong>{point.lead}</strong> {point.detail}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-300/80 bg-slate-100/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/70">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                Terms You Should Know
              </h3>
              <div className="mt-3 space-y-2">
                {glossary.slice(0, 3).map((entry) => (
                  <p key={entry.term} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    <strong>{entry.term}:</strong> {entry.meaning}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <MilestoneTimeline milestones={milestones} selectedYear={selectedYear} />
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/50 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Full Glossary And Meanings
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {glossary.map((entry) => (
              <div
                key={entry.term}
                className="rounded-xl border border-slate-200/70 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-900/70"
              >
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.term}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{entry.meaning}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
