"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Bell, Loader2, Rows3, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { client } from "@/lib/orpc";
import { Button } from "@/components/ui/button";

type SubscriptionState = Awaited<ReturnType<typeof client.subscriptions.listMySubscriptions>>;
type ProposalRepo = "eip" | "erc" | "rip" | "eips" | "ercs" | "rips";

function isProposalRepo(value: string): value is ProposalRepo {
  return value === "eip" || value === "erc" || value === "rip" || value === "eips" || value === "ercs" || value === "rips";
}

function normalizeProposalRepo(repo: ProposalRepo): "eip" | "erc" | "rip" {
  return repo.toLowerCase().replace(/s$/, "") as "eip" | "erc" | "rip";
}

export function SubscriptionsPanel() {
  const [data, setData] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await client.subscriptions.listMySubscriptions({});
      setData(result);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const removeProposal = async (repo: "eip" | "erc" | "rip", number: number, key: string) => {
    setRemoving(key);
    try {
      await client.subscriptions.unsubscribeFromProposal({ repo, number });
      toast.success("Removed subscription");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove subscription");
    } finally {
      setRemoving(null);
    }
  };

  const removeRepository = async (repo: "eip" | "erc" | "rip", key: string) => {
    setRemoving(key);
    try {
      await client.subscriptions.unsubscribeFromRepository({ repo });
      toast.success("Removed subscription");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove subscription");
    } finally {
      setRemoving(null);
    }
  };

  const removeUpgrade = async (slug: string, key: string) => {
    setRemoving(key);
    try {
      await client.subscriptions.unsubscribeFromUpgrade({ slug });
      toast.success("Removed subscription");
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove subscription");
    } finally {
      setRemoving(null);
    }
  };

  const isEmpty = !loading && data && data.proposals.length === 0 && data.repositories.length === 0 && data.upgrades.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-6">
      <div className="mb-5">
        <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground">My Subscriptions</h2>
        <p className="text-sm text-muted-foreground">Manage proposal, repo-wide, and upgrade email alerts in one place.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading subscriptions...
        </div>
      ) : isEmpty ? (
        <p className="text-sm text-muted-foreground">You have no active subscriptions yet.</p>
      ) : (
        <div className="space-y-6">
          {data && data.proposals.length > 0 && (
            <Section title="Proposal alerts" icon={<Bell className="h-4 w-4 text-primary" />}>
              {data.proposals.map((item) => {
                const key = `proposal:${item.id}`;
                const proposalRepo = isProposalRepo(item.repo) ? normalizeProposalRepo(item.repo) : null;
                return (
                  <SubscriptionRow
                    key={key}
                    title={`${item.repo.toUpperCase()}-${item.number}`}
                    description={item.title || "Proposal alert"}
                    meta={`${item.filter} • ${item.status || "Unknown status"}`}
                    href={item.path}
                    busy={removing === key}
                    onRemove={proposalRepo ? () => void removeProposal(proposalRepo, item.number, key) : undefined}
                  />
                );
              })}
            </Section>
          )}

          {data && data.repositories.length > 0 && (
            <Section title="Repo-wide alerts" icon={<Rows3 className="h-4 w-4 text-primary" />}>
              {data.repositories.map((item) => {
                const key = `repository:${item.id}`;
                const repositoryRepo = isProposalRepo(item.repo) ? normalizeProposalRepo(item.repo) : null;
                return (
                  <SubscriptionRow
                    key={key}
                    title={item.label}
                    description="Repository-wide status and content alerts"
                    meta={item.filter}
                    href={item.path}
                    busy={removing === key}
                    onRemove={repositoryRepo ? () => void removeRepository(repositoryRepo, key) : undefined}
                  />
                );
              })}
            </Section>
          )}

          {data && data.upgrades.length > 0 && (
            <Section title="Upgrade alerts" icon={<Package className="h-4 w-4 text-primary" />}>
              {data.upgrades.map((item) => {
                const key = `upgrade:${item.id}`;
                return (
                  <SubscriptionRow
                    key={key}
                    title={item.name}
                    description="Upgrade composition and stage alerts"
                    meta={item.filter}
                    href={item.path}
                    busy={removing === key}
                    onRemove={() => void removeUpgrade(item.slug, key)}
                  />
                );
              })}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SubscriptionRow({
  title,
  description,
  meta,
  href,
  busy,
  onRemove,
}: {
  title: string;
  description: string;
  meta: string;
  href: string;
  busy: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/50 p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link href={href} className="font-medium text-foreground hover:text-primary">
            {title}
          </Link>
          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
            {meta}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRemove} disabled={busy || !onRemove} className="rounded-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Remove
      </Button>
    </div>
  );
}
