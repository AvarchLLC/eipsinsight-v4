"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { client } from "@/lib/orpc";

type UpgradeSubscriptionCardProps = {
  slug: string;
  name: string;
};

const FILTER_OPTIONS = [
  {
    id: "stage",
    label: "Stage changes",
    description: "Email me when EIPs are added, removed, or moved between upgrade buckets.",
  },
  {
    id: "all",
    label: "Everything",
    description: "Uses stage changes now and can expand to broader upgrade alerts later.",
  },
] as const;

type FilterId = (typeof FILTER_OPTIONS)[number]["id"];

export function UpgradeSubscriptionCard({ slug, name }: UpgradeSubscriptionCardProps) {
  const router = useRouter();
  const { data: session, loading: sessionLoading } = useSession();
  const [selectedFilter, setSelectedFilter] = useState<FilterId>("stage");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session?.user) {
      setIsSubscribed(false);
      setSelectedFilter("stage");
      return;
    }

    let cancelled = false;
    setIsLoadingSubscription(true);

    client.subscriptions
      .getUpgradeSubscription({ slug })
      .then((result) => {
        if (cancelled) return;
        setIsSubscribed(result.subscribed);
        setSelectedFilter((result.subscription?.filter as FilterId | undefined) ?? "stage");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load upgrade subscription:", error);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSubscription(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user, sessionLoading, slug]);

  const handleToggle = async () => {
    if (!session?.user) {
      toast.message(`Sign in to follow ${name}`, {
        description: "We will bring you back after login.",
      });
      router.push(`/login?returnTo=${encodeURIComponent(`/upgrade/${slug}`)}`);
      return;
    }

    setIsUpdating(true);
    try {
      if (!isSubscribed) {
        await client.subscriptions.subscribeToUpgrade({ slug, filter: selectedFilter });
        setIsSubscribed(true);
        toast.success(`Following ${name}`);
      } else {
        await client.subscriptions.unsubscribeFromUpgrade({ slug });
        setIsSubscribed(false);
        toast.success(`Unfollowed ${name}`);
      }
    } catch (error) {
      console.error("Failed to toggle upgrade subscription:", error);
      toast.error("Could not update upgrade subscription");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFilterChange = async (filter: FilterId) => {
    setSelectedFilter(filter);
    if (!isSubscribed) return;

    setIsUpdating(true);
    try {
      await client.subscriptions.subscribeToUpgrade({ slug, filter });
      toast.success("Upgrade alert type updated");
    } catch (error) {
      console.error("Failed to update upgrade subscription filter:", error);
      toast.error("Could not update upgrade alert type");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Email updates for {name}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow inclusion and bucket changes for this upgrade.
          </p>
        </div>

        <Button
          type="button"
          variant={isSubscribed ? "outline" : "default"}
          onClick={handleToggle}
          disabled={sessionLoading || isLoadingSubscription || isUpdating}
          className={cn(
            "min-w-[170px] rounded-full",
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
              Get updates
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
              )
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
