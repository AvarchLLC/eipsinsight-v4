"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Loader2, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { client } from "@/lib/orpc";

type RepositorySubscriptionCardProps = {
  repo: "eip" | "erc" | "rip";
};

const FILTER_OPTIONS = [
  {
    id: "status",
    label: "Status only",
    description: "Email me when proposals in this repo change stage.",
  },
  {
    id: "all",
    label: "Everything",
    description: "Status changes plus content updates across the repo.",
  },
] as const;

type FilterId = (typeof FILTER_OPTIONS)[number]["id"];

function getRepoLabel(repo: "eip" | "erc" | "rip") {
  return repo === "eip" ? "All EIPs" : repo === "erc" ? "All ERCs" : "All RIPs";
}

function getLoginReturnTo(repo: "eip" | "erc" | "rip") {
  return repo === "eip" ? "/standards" : repo === "erc" ? "/standards" : "/standards";
}

export function RepositorySubscriptionCard({ repo }: RepositorySubscriptionCardProps) {
  const router = useRouter();
  const { data: session, loading: sessionLoading } = useSession();
  const [selectedFilter, setSelectedFilter] = useState<FilterId>("status");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session?.user) {
      setIsSubscribed(false);
      setSelectedFilter("status");
      return;
    }

    let cancelled = false;
    setIsLoadingSubscription(true);

    client.subscriptions
      .getRepositorySubscription({ repo })
      .then((result) => {
        if (cancelled) return;
        setIsSubscribed(result.subscribed);
        setSelectedFilter((result.subscription?.filter as FilterId | undefined) ?? "status");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load repository subscription:", error);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSubscription(false);
      });

    return () => {
      cancelled = true;
    };
  }, [repo, session?.user, sessionLoading]);

  const handleToggle = async () => {
    if (!session?.user) {
      toast.message(`Sign in to follow ${getRepoLabel(repo)}`, {
        description: "We will bring you back after login.",
      });
      router.push(`/login?returnTo=${encodeURIComponent(getLoginReturnTo(repo))}`);
      return;
    }

    setIsUpdating(true);
    try {
      if (!isSubscribed) {
        await client.subscriptions.subscribeToRepository({ repo, filter: selectedFilter });
        setIsSubscribed(true);
        toast.success(`Following ${getRepoLabel(repo)}`);
      } else {
        await client.subscriptions.unsubscribeFromRepository({ repo });
        setIsSubscribed(false);
        toast.success(`Unfollowed ${getRepoLabel(repo)}`);
      }
    } catch (error) {
      console.error("Failed to toggle repository subscription:", error);
      toast.error("Could not update repository subscription");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFilterChange = async (filter: FilterId) => {
    setSelectedFilter(filter);
    if (!isSubscribed) return;

    setIsUpdating(true);
    try {
      await client.subscriptions.updateRepositorySubscriptionFilter({ repo, filter });
      toast.success("Repo alert type updated");
    } catch (error) {
      console.error("Failed to update repository subscription filter:", error);
      toast.error("Could not update repo alert type");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Rows3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{getRepoLabel(repo)}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow the whole repo instead of one proposal.
          </p>
        </div>

        <Button
          type="button"
          variant={isSubscribed ? "outline" : "default"}
          onClick={handleToggle}
          disabled={sessionLoading || isLoadingSubscription || isUpdating}
          className={cn(
            "min-w-[160px] rounded-full",
            isSubscribed && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
          )}
        >
          {sessionLoading || isLoadingSubscription || isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Working...
            </>
          ) : isSubscribed ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Following
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" />
              Follow repo
            </>
          )}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => {
          const selected = selectedFilter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => void handleFilterChange(option.id)}
              disabled={isUpdating}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-70",
                selected
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <span className="font-medium text-foreground">{option.label}</span>
              {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {FILTER_OPTIONS.find((option) => option.id === selectedFilter)?.description}
      </p>
    </div>
  );
}
