"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Coins,
  Cpu,
  ExternalLink,
  FileCode,
  Flame,
  Layers,
  ShieldCheck,
  Tag,
  Terminal,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Milestone } from "@/data/resources/milestones";

const iconMap = {
  Flame,
  Zap,
  ShieldCheck,
  FileCode,
  Layers,
  Cpu,
  Coins,
  Terminal,
  CheckCircle: CheckCircle2,
};

const categoryBadgeStyles = {
  upgrades: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  standards: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  governance: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  ux: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const categoryGradients = {
  upgrades: "from-purple-500/20 via-purple-500/5 to-transparent",
  standards: "from-blue-500/20 via-blue-500/5 to-transparent",
  governance: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  ux: "from-amber-500/20 via-amber-500/5 to-transparent",
};

const statusBadgeStyles = {
  purple: "border-purple-500/40 bg-purple-500/15 text-purple-800 dark:text-purple-200",
  success: "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  info: "border-cyan-500/40 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200",
};

type MilestoneCardProps = {
  milestone: Milestone;
  index: number;
  align: "left" | "right";
};

export function MilestoneCard({ milestone, index, align }: MilestoneCardProps) {
  const isLeft = align === "left";
  const IconComponent = iconMap[milestone.iconName] || Layers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      className={cn("group w-full", isLeft ? "lg:col-start-1" : "lg:col-start-3")}
    >
      <Card className="relative overflow-hidden border-border/80 bg-card/90 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg dark:bg-card/70">
        {/* Top Accent Gradient Bar */}
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-1 bg-linear-to-r",
            milestone.category === "upgrades" && "from-purple-500 to-indigo-500",
            milestone.category === "standards" && "from-blue-500 to-cyan-500",
            milestone.category === "governance" && "from-emerald-500 to-teal-500",
            milestone.category === "ux" && "from-amber-500 to-orange-500"
          )}
        />

        {/* Ambient Top Background Glow */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-linear-to-b opacity-40 transition-opacity duration-300 group-hover:opacity-70",
            categoryGradients[milestone.category]
          )}
        />

        <CardContent className="relative space-y-4 p-5 sm:p-6">
          {/* Header Row: Category Badge, Date & Status */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border shadow-xs transition-transform duration-300 group-hover:scale-105",
                  categoryBadgeStyles[milestone.category]
                )}
              >
                <IconComponent className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
                  categoryBadgeStyles[milestone.category]
                )}
              >
                {milestone.category}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary/70" />
                {milestone.date}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
                  statusBadgeStyles[milestone.statusType ?? "purple"]
                )}
              >
                {milestone.statusBadge}
              </span>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl group-hover:text-primary transition-colors">
              {milestone.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {milestone.description}
            </p>
          </div>

          {/* Referenced EIPs Chips */}
          {milestone.eips && milestone.eips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs font-semibold text-muted-foreground mr-1">
                EIPs / ERCs:
              </span>
              {milestone.eips.map((eip) => (
                <Link
                  key={eip.number}
                  href={eip.link}
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition hover:bg-primary/20 hover:border-primary/50"
                  title={eip.title}
                >
                  <span>EIP-{eip.number}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              ))}
            </div>
          )}

          {/* Callout Cards: Why It Matters & Takeaway */}
          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Why It Matters
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                {milestone.whyItMatters}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Key Takeaway
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {milestone.takeaway}
              </p>
            </div>
          </div>

          {/* Footer: Term Badges & External Link */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              {milestone.terms.map((term) => (
                <span
                  key={term}
                  className="rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {term}
                </span>
              ))}
            </div>

            {milestone.externalLink && (
              <Link
                href={milestone.externalLink.url}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {milestone.externalLink.label}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
