import React from "react";

const STAT_ACCENT: Record<string, { chip: string; icon: string }> = {
  emerald: { chip: "bg-emerald-500/15", icon: "text-emerald-500" },
  blue: { chip: "bg-blue-500/15", icon: "text-blue-500" },
  amber: { chip: "bg-amber-500/15", icon: "text-amber-500" },
  violet: { chip: "bg-violet-500/15", icon: "text-violet-500" },
  rose: { chip: "bg-rose-500/15", icon: "text-rose-500" },
  cyan: { chip: "bg-cyan-500/15", icon: "text-cyan-500" },
};

export type StatAccent = keyof typeof STAT_ACCENT;

/** Compact KPI tile used across the analytics pages. */
export function StatCard({
  icon: Icon,
  accent,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  accent: StatAccent | string;
  label: string;
  value: string;
  sub?: string;
}) {
  const a = STAT_ACCENT[accent] ?? STAT_ACCENT.emerald;
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-4 backdrop-blur-sm transition-colors hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${a.chip}`}>
          <Icon className={`h-4 w-4 ${a.icon}`} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Gradient insight band that leads an analytics page with a headline + story. */
export function AnalyticsHero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.07] via-card/50 to-card/40 p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
      <h2 className="dec-title mt-1.5 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {children && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  );
}
