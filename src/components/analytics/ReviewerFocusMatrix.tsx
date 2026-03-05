"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface RepoDistribution {
  actor: string;
  repo: string;
  count: number;
  pct: number;
}

interface ReviewerFocusMatrixProps {
  data: RepoDistribution[];
  searchQuery?: string;
  sortBy?: "name" | "total";
  currentPage?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
}

const DEFAULT_ITEMS_PER_PAGE = 5;

// Color mapping for repositories with rich gradient options
const categoryColorMap: Record<string, { 
  bg: string; 
  gradients: string[]; 
  text: string; 
  accent: string; 
  light: string 
}> = {
  EIPs: {
    bg: "from-blue-600 to-blue-700",
    gradients: [
      "from-blue-400 via-blue-500 to-blue-600",
      "from-cyan-400 via-blue-500 to-indigo-600",
      "from-sky-400 via-blue-500 to-purple-600",
    ],
    text: "text-blue-600",
    accent: "bg-blue-500/20",
    light: "bg-blue-50 dark:bg-blue-950/30"
  },
  ERCs: {
    bg: "from-purple-600 to-purple-700",
    gradients: [
      "from-purple-400 via-purple-500 to-purple-600",
      "from-violet-400 via-purple-500 to-indigo-600",
      "from-fuchsia-400 via-purple-500 to-pink-600",
    ],
    text: "text-purple-600",
    accent: "bg-purple-500/20",
    light: "bg-purple-50 dark:bg-purple-950/30"
  },
  RIPs: {
    bg: "from-pink-600 to-pink-700",
    gradients: [
      "from-pink-400 via-pink-500 to-pink-600",
      "from-rose-400 via-pink-500 to-purple-600",
      "from-red-400 via-pink-500 to-orange-600",
    ],
    text: "text-pink-600",
    accent: "bg-pink-500/20",
    light: "bg-pink-50 dark:bg-pink-950/30"
  },
};

/**
 * Extracts the category name from a repo name
 * e.g., "ethereum/EIPs" -> "EIPs", "ethereum/ERCs" -> "ERCs"
 */
function getRepoCategory(repoName: string): string {
  const parts = repoName.split("/");
  return parts[1] || repoName;
}

/**
 * Gets a gradient for a reviewer based on their name and category
 * Creates variety by cycling through different gradients
 */
function getGradientForReviewer(reviewer: string, category: string): string {
  // Simple hash function to get consistent color for same reviewer
  let hash = 0;
  for (let i = 0; i < reviewer.length; i++) {
    hash = ((hash << 5) - hash) + reviewer.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const categoryData = categoryColorMap[category];
  const gradientIndex = Math.abs(hash) % categoryData.gradients.length;
  return categoryData.gradients[gradientIndex];
}


/**
 * Gets color intensity class based on review count
 * Uses gradual intensification from light to dark
 */
function getIntensityClass(count: number, maxCount: number): string {
  if (count === 0) return "bg-slate-100/40 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400";
  
  const intensity = count / maxCount;
  
  if (intensity < 0.25) return "bg-blue-200/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300";
  if (intensity < 0.5) return "bg-blue-400/70 dark:bg-blue-800/60 text-blue-900 dark:text-blue-100";
  if (intensity < 0.75) return "bg-blue-500/80 dark:bg-blue-700/70 text-blue-900 dark:text-blue-50";
  return "bg-blue-600/100 dark:bg-blue-600/100 text-white";
}

/**
 * Transforms flat repo distribution data into a matrix structure
 * Groups reviews by reviewer and category
 */
function transformToMatrix(data: RepoDistribution[]) {
  const matrix: Record<string, Record<string, number>> = {};
  let maxCount = 1;

  // Build the matrix and track max count for color intensity
  data.forEach((row) => {
    const category = getRepoCategory(row.repo);
    if (!matrix[row.actor]) {
      matrix[row.actor] = {};
    }
    matrix[row.actor][category] = row.count;
    maxCount = Math.max(maxCount, row.count);
  });

  return { matrix, maxCount };
}

/**
 * ReviewerFocusMatrix Component
 * Displays a matrix visualization showing which repository categories
 * each reviewer focuses on, with color intensity representing review count.
 * Supports pagination, search, and sorting.
 */
export function ReviewerFocusMatrix({
  data,
  searchQuery = "",
  sortBy = "name",
  currentPage = 1,
  onPageChange = () => {},
  itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
}: ReviewerFocusMatrixProps) {
  // Extract unique categories and transform data
  const { matrix, maxCount, categories } = useMemo(() => {
    const cats = new Set<string>();
    data.forEach((row) => {
      cats.add(getRepoCategory(row.repo));
    });
    const sortedCats = Array.from(cats).sort(); // EIPs, ERCs, RIPs alphabetically
    const { matrix, maxCount } = transformToMatrix(data);
    return { matrix, maxCount, categories: sortedCats };
  }, [data]);

  // Filter and sort reviewers
  const processedReviewers = useMemo(() => {
    let reviewers = Object.keys(matrix)
      .filter((reviewer) =>
        reviewer.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Sort based on selected metric
    if (sortBy === "total") {
      reviewers.sort((a, b) => {
        const aTotal = categories.reduce(
          (sum, cat) => sum + (matrix[a][cat] || 0),
          0
        );
        const bTotal = categories.reduce(
          (sum, cat) => sum + (matrix[b][cat] || 0),
          0
        );
        return bTotal - aTotal; // High to low
      });
    } else {
      // Sort alphabetically
      reviewers.sort();
    }

    return reviewers;
  }, [matrix, searchQuery, sortBy, categories]);

  // Pagination
  const totalPages = Math.ceil(processedReviewers.length / itemsPerPage);
  const validPage = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedReviewers = processedReviewers.slice(
    (validPage - 1) * itemsPerPage,
    validPage * itemsPerPage
  );

  if (Object.keys(matrix).length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No reviewer data available</p>
      </div>
    );
  }

  return (
    <div>
      {/* Grid of reviewer cards */}
      <div className="grid gap-4 mb-6">
        {paginatedReviewers.map((reviewer) => {
          const reviewerCounts = {
            EIPs: matrix[reviewer]["EIPs"] || 0,
            ERCs: matrix[reviewer]["ERCs"] || 0,
            RIPs: matrix[reviewer]["RIPs"] || 0,
          };
          const total = Object.values(reviewerCounts).reduce((a, b) => a + b, 0);
          
          // Find dominant specialty
          const dominant = Object.entries(reviewerCounts).reduce((a, b) =>
            b[1] > a[1] ? b : a
          ) as [string, number];

          return (
            <div
              key={reviewer}
              className="group rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/80 p-5 hover:border-border/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Header with name and specialty badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <span className="font-bold text-sm text-primary">
                      {reviewer.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{reviewer}</p>
                    <p className="text-xs text-muted-foreground">{total} reviews total</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${categoryColorMap[dominant[0]].light}`}>
                  <TrendingUp className={`h-3.5 w-3.5 ${categoryColorMap[dominant[0]].text}`} />
                  <span className={`text-xs font-semibold ${categoryColorMap[dominant[0]].text}`}>
                    {dominant[0]}
                  </span>
                </div>
              </div>

              {/* Progress bars for each category */}
              <div className="space-y-3">
                {categories.map((category) => {
                  const count = reviewerCounts[category as keyof typeof reviewerCounts] || 0;
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  const colors = categoryColorMap[category];

                  return (
                    <Tooltip key={category}>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground">{category}</span>
                            <span className={`text-xs font-bold ${colors.text}`}>{count}</span>
                          </div>
                          <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden shadow-sm">
                            <div
                              className={`h-full bg-gradient-to-r ${getGradientForReviewer(reviewer, category)} transition-all duration-500 ease-out`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className={`${colors.accent} border-0 bg-opacity-90 backdrop-blur-sm`}>
                        <div className="text-sm">
                          <p className={`font-semibold ${colors.text}`}>{reviewer}</p>
                          <p className="text-xs text-muted-foreground">{count} {category} reviews</p>
                          <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% of their total</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Focus area indicator */}
              {dominant[1] > 0 && (
                <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{dominant[0]} specialist</span>
                    {" • "}
                    {((dominant[1] / total) * 100).toFixed(0)}% focus
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {paginatedReviewers.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "No reviewers match your search." : "No reviewer data available."}
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {processedReviewers.length > itemsPerPage && (
        <div className="flex items-center justify-between border-t border-border/70 pt-6">
          <div className="text-xs text-muted-foreground">
            Showing {(validPage - 1) * itemsPerPage + 1}–
            {Math.min(validPage * itemsPerPage, processedReviewers.length)} of{" "}
            {processedReviewers.length} reviewers
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, validPage - 1))}
              disabled={validPage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
              Page {validPage} of {totalPages === 0 ? 1 : totalPages}
            </div>
            <button
              onClick={() => onPageChange(Math.min(totalPages, validPage + 1))}
              disabled={validPage === totalPages || totalPages === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
