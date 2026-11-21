"use client";

import React from "react";
import { Users, CheckCircle2, Activity, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { StatCard } from "@/components/analytics/stat-card";

interface EditorsKpiBarProps {
  totalActions: number;
  activeEditors: number;
  totalEditors: number;
  totalReviews: number;
  avgResponseDays: number | null;
  totalCategories: number;
  thinCategoriesCount: number;
}

export function EditorsKpiBar({
  totalActions,
  activeEditors,
  totalEditors,
  totalReviews,
  avgResponseDays,
  totalCategories,
  thinCategoriesCount,
}: EditorsKpiBarProps) {
  const activeRate = totalEditors > 0 ? Math.round((activeEditors / totalEditors) * 100) : 0;
  const reviewPct = totalActions > 0 ? Math.round((totalReviews / totalActions) * 100) : 0;
  const isHealthyCoverage = thinCategoriesCount === 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard
        icon={Users}
        accent="blue"
        label="Active Editors"
        value={`${activeEditors} / ${totalEditors}`}
        sub={`${activeRate}% active in window`}
      />
      <StatCard
        icon={CheckCircle2}
        accent="emerald"
        label="PR Reviews"
        value={totalReviews.toLocaleString()}
        sub={`${reviewPct}% of total actions`}
      />
      <StatCard
        icon={Activity}
        accent="violet"
        label="Total Actions"
        value={totalActions.toLocaleString()}
        sub="Reviews, comments & commits"
      />
      <StatCard
        icon={Clock}
        accent="amber"
        label="Median Latency"
        value={avgResponseDays != null ? `${avgResponseDays.toFixed(1)}d` : "–"}
        sub="PR open to first review"
      />
      <StatCard
        icon={isHealthyCoverage ? ShieldCheck : ShieldAlert}
        accent={isHealthyCoverage ? "cyan" : "rose"}
        label="Coverage Health"
        value={`${Math.max(0, totalCategories - thinCategoriesCount)} / ${totalCategories}`}
        sub={isHealthyCoverage ? "All categories staffed" : `${thinCategoriesCount} thin categories`}
      />
    </div>
  );
}
