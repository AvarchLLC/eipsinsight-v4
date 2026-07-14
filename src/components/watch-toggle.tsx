"use client";

import { useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { client } from "@/lib/orpc";
import { Button } from "@/components/ui/button";

interface WatchToggleProps {
  itemType: "proposal" | "repository" | "upgrade" | "author";
  itemId: string; // for proposal: "repo-number", for repository: "repo", for upgrade: "slug", for author: "name"
  initialWatched?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function WatchToggle({
  itemType,
  itemId,
  initialWatched = false,
  className,
  variant = "outline",
  size = "sm",
}: WatchToggleProps) {
  const [isWatched, setIsWatched] = useState(initialWatched);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    // Optimistic update
    const prevWatched = isWatched;
    setIsWatched(!isWatched);

    try {
      const result = await client.watchlist.toggleWatch({ itemType, itemId });
      setIsWatched(result.watched);
      if (result.watched) {
        toast.success("Added to watchlist");
      } else {
        toast.success("Removed from watchlist");
      }
    } catch (error) {
      // Revert on error
      setIsWatched(prevWatched);
      toast.error("Failed to update watchlist");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={isWatched ? "secondary" : variant}
      size={size}
      className={className}
      onClick={handleToggle}
      disabled={isLoading}
      title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
    >
      {isLoading ? (
        <Loader2 className={`h-4 w-4 animate-spin ${size !== "icon" ? "mr-2" : ""}`} />
      ) : isWatched ? (
        <BellRing className={`h-4 w-4 ${size !== "icon" ? "mr-2" : ""}`} />
      ) : (
        <Bell className={`h-4 w-4 ${size !== "icon" ? "mr-2" : ""}`} />
      )}
      {size !== "icon" && (isWatched ? "Watching" : "Watch")}
    </Button>
  );
}
