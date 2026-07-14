"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FolderGit2, Loader2, Package, Users, Bell } from "lucide-react";
import { client } from "@/lib/orpc";
import { WatchToggle } from "@/components/watch-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type WatchlistState = Awaited<ReturnType<typeof client.watchlist.getWatchlist>>;

export default function WatchlistPage() {
  const [data, setData] = useState<WatchlistState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"proposals" | "repositories" | "upgrades" | "authors">("proposals");

  useEffect(() => {
    async function load() {
      try {
        const result = await client.watchlist.getWatchlist({});
        setData(result);
      } catch (error) {
        console.error("Failed to load watchlist", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabs = [
    { id: "proposals", label: "Proposals", icon: BookOpen, count: data?.proposals.length || 0 },
    { id: "repositories", label: "Repositories", icon: FolderGit2, count: data?.repositories.length || 0 },
    { id: "upgrades", label: "Upgrades", icon: Package, count: data?.upgrades.length || 0 },
    { id: "authors", label: "Authors", icon: Users, count: data?.authors.length || 0 },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Watchlist</h1>
        <p className="text-muted-foreground mt-2">
          Manage your pinned EIPs, repositories, network upgrades, and authors.
        </p>
      </div>

      <div className="flex space-x-1 rounded-xl bg-muted/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <Badge variant="secondary" className="ml-1 px-1.5 min-w-[20px] justify-center">
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "proposals" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data?.proposals.length === 0 ? (
                <EmptyState type="proposals" />
              ) : (
                data?.proposals.map((item) => (
                  <Card key={item.id} className="flex flex-col">
                    <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                      <div className="space-y-1">
                        <Link href={item.path} className="font-semibold hover:underline">
                          {item.repo.toUpperCase()}-{item.number}
                        </Link>
                        {item.status && (
                          <Badge variant="outline" className="ml-2">
                            {item.status}
                          </Badge>
                        )}
                      </div>
                      <WatchToggle itemType="proposal" itemId={`${item.repo}-${item.number}`} initialWatched />
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.title}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === "repositories" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data?.repositories.length === 0 ? (
                <EmptyState type="repositories" />
              ) : (
                data?.repositories.map((item) => (
                  <Card key={item.id} className="flex flex-col">
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                      <Link href={item.path} className="font-semibold hover:underline">
                        {item.label}
                      </Link>
                      <WatchToggle itemType="repository" itemId={item.repo} initialWatched />
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === "upgrades" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data?.upgrades.length === 0 ? (
                <EmptyState type="upgrades" />
              ) : (
                data?.upgrades.map((item) => (
                  <Card key={item.id} className="flex flex-col">
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                      <Link href={item.path} className="font-semibold hover:underline">
                        {item.name}
                      </Link>
                      <WatchToggle itemType="upgrade" itemId={item.slug} initialWatched />
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === "authors" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data?.authors.length === 0 ? (
                <EmptyState type="authors" />
              ) : (
                data?.authors.map((item) => (
                  <Card key={item.id} className="flex flex-col">
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                      <Link href={item.path} className="font-semibold hover:underline">
                        {item.name}
                      </Link>
                      <WatchToggle itemType="author" itemId={item.name} initialWatched />
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No watched {type}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        You aren't watching any {type} yet. When you see something interesting, click the Watch button to keep track of it here.
      </p>
    </div>
  );
}
