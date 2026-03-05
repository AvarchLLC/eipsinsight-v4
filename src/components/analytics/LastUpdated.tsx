"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface LastUpdatedProps {
  timestamp: string | Date;
  showIcon?: boolean;
  className?: string;
}

/**
 * Formats a timestamp into a human-readable relative time string.
 * Examples: "just now", "5 minutes ago", "2 hours ago", "3 days ago"
 */
function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();

  // Validate date
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffMonths / 12);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  } else {
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  }
}

/**
 * LastUpdated Component
 *
 * Displays when analytics data was last refreshed in a human-friendly format.
 * Renders as a subtle, muted label suitable for card headers/footers.
 *
 * @param timestamp - The timestamp to display (string or Date)
 * @param showIcon - Whether to show a clock icon (default: false)
 * @param className - Additional Tailwind classes for customization
 *
 * @example
 * <LastUpdated timestamp={data.updated_at} />
 * // Renders: "Updated 2 hours ago"
 */
export function LastUpdated({
  timestamp,
  showIcon = true,
  className = "",
}: LastUpdatedProps): React.ReactElement {
  const [relativeTime, setRelativeTime] = useState<string>("just now");

  // Format time on client to avoid hydration mismatches
  // Update every minute so "5 minutes ago" becomes "6 minutes ago", etc.
  useEffect(() => {
    setRelativeTime(formatRelativeTime(timestamp));
    
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(timestamp));
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1 text-sm text-foreground/75 ${className}`}
      title={typeof timestamp === "string" ? timestamp : timestamp.toISOString()}
    >
      {showIcon && <Clock className="h-4 w-4 opacity-75" />}
      <span className="whitespace-nowrap font-medium">Updated {relativeTime}</span>
    </div>
  );
}

export default LastUpdated;
