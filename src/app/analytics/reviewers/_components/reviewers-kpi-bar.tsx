"use client";

import React from "react";
import { Users, CheckCircle2, GitPullRequest, Clock, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/analytics/stat-card";

interface ReviewersKpiBarProps {
  activeReviewers: number;
  totalReviewers: number;
  totalReviews: number;
  totalPrsTouched: number;
  avgResponseDays: number | null;
}

export function ReviewersKpiBar({
  activeReviewers,
  totalReviewers,
  totalReviews,
  totalPrsTouched,
  avgResponseDays,
}: ReviewersKpiBarProps) {
  const activeRate = totalReviewers > 0 ? Math.round((activeReviewers / totalReviewers) * 100) : 0;
  const avgPerReviewer = activeReviewers > 0 ? Math.round(totalReviews / activeReviewers) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={Users}
        accent="emerald"
        label="Active Reviewers"
        value={`${activeReviewers} / ${totalReviewers}`}
        sub={`${activeRate}% active in window`}
      />
      <StatCard
        icon={CheckCircle2}
        accent="blue"
        label="PR Reviews Logged"
        value={totalReviews.toLocaleString()}
        sub={`${avgPerReviewer} avg per active reviewer`}
      />
      <StatCard
        icon={GitPullRequest}
        accent="amber"
        label="PRs Touched"
        value={totalPrsTouched.toLocaleString()}
        sub="Unique PRs with reviewer action"
      />
      <StatCard
        icon={Clock}
        accent="violet"
        label="Median Turnaround"
        value={avgResponseDays != null ? `${avgResponseDays.toFixed(1)}d` : "–"}
        sub="PR open to first review"
      />
    </div>
  );
}
