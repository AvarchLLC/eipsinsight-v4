"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { client } from "@/lib/orpc";

type ProposalSubscriptionCardProps = {
  repo: "eip" | "erc" | "rip";
  number: number;
  currentStatus: string;
};

const FILTER_OPTIONS = [
  {
    id: "all",
    label: "Everything",
    description: "Status changes and file content updates.",
    enabled: true,
  },
  {
    id: "status",
    label: "Status",
    description: "Only stage changes like Draft, Review, Last Call, and Final.",
    enabled: true,
  },
  {
    id: "content",
    label: "Content",
    description: "Proposal file edit alerts.",
    enabled: true,
  },
] as const;

type FilterId = (typeof FILTER_OPTIONS)[number]["id"];

export function ProposalSubscriptionCard({
  repo,
  number,
  currentStatus,
}: ProposalSubscriptionCardProps) {
  const router = useRouter();
  const { data: session, loading: sessionLoading } = useSession();
  const [selectedFilter, setSelectedFilter] = useState<FilterId>("all");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isUpdatingFilter, setIsUpdatingFilter] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session?.user) {
      setIsSubscribed(false);
      setSelectedFilter("all");
      return;
    }

    let cancelled = false;
    setIsLoadingSubscription(true);

    client.subscriptions
      .getProposalSubscription({ repo, number })
      .then((result) => {
        if (cancelled) return;

        setIsSubscribed(result.subscribed);
        setSelectedFilter((result.subscription?.filter as FilterId | undefined) ?? "all");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load proposal subscription:", error);
        toast.error("Failed to load subscription state");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSubscription(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [repo, number, session?.user, sessionLoading]);

  const handleToggle = async () => {
    if (!session?.user) {
      toast.message("Sign in to follow this proposal", {
        description: "We will take you to the login page and return you here after auth.",
      });
      router.push(`/login?returnTo=${encodeURIComponent(`/${repo}s/${number}`)}`);
      return;
    }

    setIsToggling(true);

    try {
      if (!isSubscribed) {
        const result = await client.subscriptions.subscribeToProposal({
          repo,
          number,
          filter: selectedFilter,
        });

        setIsSubscribed(true);
        setSelectedFilter(result.subscription.filter as FilterId);
        toast.success(`Following ${repo.toUpperCase()}-${number}`, {
          description: `You will receive ${selectedFilter} notifications for this proposal.`,
        });
      } else {
        await client.subscriptions.unsubscribeFromProposal({
          repo,
          number,
        });

        setIsSubscribed(false);
        toast.success(`Unfollowed ${repo.toUpperCase()}-${number}`, {
          description: "This proposal will no longer send update notifications.",
        });
      }
    } catch (error) {
      console.error("Failed to toggle proposal subscription:", error);
      toast.error("Could not update subscription");
    } finally {
      setIsToggling(false);
    }
  };

  const handleSelectFilter = async (nextFilter: FilterId) => {
    setSelectedFilter(nextFilter);

    if (!isSubscribed) {
      return;
    }

    setIsUpdatingFilter(true);

    try {
      const result = await client.subscriptions.updateProposalSubscriptionFilter({
        repo,
        number,
        filter: nextFilter,
      });

      setSelectedFilter(result.subscription.filter as FilterId);
      toast.success("Notification filter updated", {
        description: `This subscription now tracks ${nextFilter} changes.`,
      });
    } catch (error) {
      console.error("Failed to update subscription filter:", error);
      toast.error("Could not update notification filter");
    } finally {
      setIsUpdatingFilter(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              {isSubscribed ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Email updates for {repo.toUpperCase()}-{number}
                </h3>
                <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {currentStatus}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose how much you want to hear about this proposal.
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant={isSubscribed ? "outline" : "default"}
          onClick={handleToggle}
          disabled={sessionLoading || isLoadingSubscription || isToggling}
          className={cn(
            "min-w-[170px] rounded-full",
            isSubscribed && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
          )}
        >
          {sessionLoading || isLoadingSubscription || isToggling ? (
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
              Get updates
            </>
          )}
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => {
          const selected = selectedFilter === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => void handleSelectFilter(option.id)}
              disabled={isUpdatingFilter || !option.enabled}
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

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {FILTER_OPTIONS.find((option) => option.id === selectedFilter)?.description}
        {" "}If you only want stage changes, pick <span className="font-medium text-foreground">Status</span>.
      </p>
    </div>
  );
}
