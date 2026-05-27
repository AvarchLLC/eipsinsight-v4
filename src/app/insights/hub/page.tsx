"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, MessageSquareText, Scale } from "lucide-react";
import { SectionSeparator } from "@/components/header";

const featureCards = [
  {
    title: "Year-Month Analysis",
    description: "Forensic monthly drilldown for proposal changes, transitions, and editor activity.",
    href: "/insights",
    icon: CalendarDays,
    points: ["Monthly summary matrix", "Status transition patterns", "Editors leaderboard + drilldown"],
  },
  {
    title: "Governance & Process",
    description: "Compact governance health report for PR flow, bottlenecks, and decision speed.",
    href: "/insights/governance",
    icon: Scale,
    points: ["Lifecycle flow and backlog", "Current governance state", "Decision-speed trend view"],
  },
  {
    title: "Editorial Commentary",
    description: "Lifecycle intelligence for a specific EIP: stage durations, PR impact, and key moments.",
    href: "/insights/commentary",
    icon: MessageSquareText,
    points: ["Timeline with governance events", "Upgrade context + stability signal", "PR intelligence breakdown"],
  },
];

export default function InsightsPage() {
  return (
    <div className="relative bg-background">
      <section id="insights-overview" className="relative w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.06),_transparent_60%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(34,211,238,0.14),_transparent_60%)]" />
          <div className="absolute left-1/2 top-0 -z-10 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full px-3 py-9 text-center sm:px-4 sm:py-10 lg:px-5 xl:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Insights</p>
          <h1 className="dec-title mt-2 text-balance text-3xl font-semibold tracking-tight leading-[1.08] sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              How Ethereum Standards
            </span>
            <br />
            <span className="persona-title bg-clip-text text-transparent">
              Evolve Through Governance
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Choose an insight mode: monthly forensics, governance health, or proposal-level lifecycle commentary.
          </p>
        </div>
      </section>
      <SectionSeparator />

      <div className="w-full px-3 pb-7 pt-3 sm:px-4 lg:px-5 xl:px-6">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                <h2 className="mt-2.5 dec-title text-xl font-semibold tracking-tight text-foreground">{card.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{card.description}</p>

                <div className="mt-2.5 space-y-1">
                  {card.points.map((point) => (
                    <div key={point} className="text-xs text-muted-foreground">
                      • {point}
                    </div>
                  ))}
                </div>

                <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
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
