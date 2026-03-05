"use client";

import React from "react";
import { Clock, FileCheck, Zap } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface EditorVelocityCardProps {
  avgResponseTime: number | null;
  totalReviews: number;
  totalPRsProcessed: number;
}

/**
 * EditorVelocityCard Component
 * Displays key editor performance metrics including average response time,
 * total reviews performed, and total PRs processed.
 */
export function EditorVelocityCard({
  avgResponseTime,
  totalReviews,
  totalPRsProcessed,
}: EditorVelocityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Editor Velocity</CardTitle>
        <CardDescription>
          Key performance metrics for editor responsiveness and throughput
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Average Response Time */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-500/10 p-2.5">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Avg Response Time
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {avgResponseTime !== null ? (
                    <>
                      {avgResponseTime.toFixed(1)}
                      <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">
                        days
                      </span>
                    </>
                  ) : (
                    <span className="text-lg text-slate-400 dark:text-slate-500">—</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Total Reviews */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/10 p-2.5">
                <FileCheck className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Reviews
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalReviews.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* PRs Processed */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-500/10 p-2.5">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  PRs Processed
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalPRsProcessed.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
