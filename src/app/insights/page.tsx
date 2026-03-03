"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, MessageSquareText, Scale } from "lucide-react";
import { SectionSeparator } from "@/components/header";

const featureCards = [
  {
    title: "Year-Month Analysis",
    description: "Forensic monthly drilldown for proposal changes, transitions, and editor activity.",
    href: "/insights/year-month-analysis",
    icon: CalendarDays,
    points: ["Monthly summary matrix", "Status transition patterns", "Editors leaderboard + drilldown"],
  },
  {
    title: "Governance & Process",
    description: "Compact governance health report for PR flow, bottlenecks, and decision speed.",
    href: "/insights/governance-and-process",
    icon: Scale,
    points: ["Lifecycle flow and backlog", "Current governance state", "Decision-speed trend view"],
  },
  {
    title: "Editorial Commentary",
    description: "Lifecycle intelligence for a specific EIP: stage durations, PR impact, and key moments.",
    href: "/insights/editorial-commentary",
    icon: MessageSquareText,
    points: ["Timeline with governance events", "Upgrade context + stability signal", "PR intelligence breakdown"],
  },
];

export default function InsightsPage() {
  return (
    <div className="relative min-h-screen bg-background">
      <section id="insights-overview" className="relative w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.06),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.14),_transparent_60%)]" />
          <div className="absolute left-1/2 top-0 -z-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative w-full px-4 py-14 text-center sm:px-6 sm:py-18 lg:px-8 xl:px-12">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Insights</p>
          <h1 className="dec-title mt-3 text-balance text-4xl font-semibold tracking-tight leading-[1.08] sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              How Ethereum Standards
            </span>
            <br />
            <span className="persona-title bg-clip-text text-transparent">
              Evolve Through Governance
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Choose an insight mode: monthly forensics, governance health, or proposal-level lifecycle commentary.
          </p>
        </div>
      </section>
      <SectionSeparator />

      <div className="w-full space-y-5 px-4 pb-12 sm:px-6 lg:px-8 xl:px-12">
        <section className="grid gap-4 lg:grid-cols-3">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="inline-flex rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="mt-3 dec-title text-xl font-semibold tracking-tight text-foreground">{card.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{card.description}</p>

                <div className="mt-3 space-y-1.5">
                  {card.points.map((point) => (
                    <div key={point} className="text-xs text-muted-foreground">
                      • {point}
                    </div>
                  ))}
                </div>

                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Open
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
