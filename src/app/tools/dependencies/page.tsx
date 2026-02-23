"use client";

import React, { useState, useEffect, useMemo } from "react";
import { client } from "@/lib/orpc";
import {
  Loader2, ArrowLeft, Search, GitBranch, X,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  Draft: "#22d3ee", Review: "#60a5fa", "Last Call": "#fbbf24",
  Final: "#34d399", Stagnant: "#94a3b8", Withdrawn: "#ef4444", Living: "#a78bfa",
};

type Node = { id: number; title: string | null; status: string; repo: string };
type Edge = { source: number; target: number };

export default function DependenciesPage() {
  const [loading, setLoading] = useState(true);
  const [repo, setRepo] = useState<"eips" | "ercs" | "rips" | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [searchEip, setSearchEip] = useState<number | undefined>(undefined);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await client.tools.getDependencyGraph({
          repo,
          eipNumber: searchEip,
        });
        setNodes(data.nodes);
        setEdges(data.edges);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [repo, searchEip]);

  const handleSearch = () => {
    const num = parseInt(search.replace(/[^0-9]/g, ""), 10);
    setSearchEip(isNaN(num) ? undefined : num);
  };

  // Find connected EIPs for the selected node
  const connectedEips = useMemo(() => {
    if (!selectedNode) return [];
    const connectedIds = new Set<number>();
    edges.forEach((e) => {
      if (e.source === selectedNode.id) connectedIds.add(e.target);
      if (e.target === selectedNode.id) connectedIds.add(e.source);
    });
    return nodes.filter((n) => connectedIds.has(n.id));
  }, [selectedNode, edges, nodes]);

  // Filter nodes that have connections
  const connectedNodes = useMemo(() => {
    const withEdges = new Set<number>();
    edges.forEach((e) => { withEdges.add(e.source); withEdges.add(e.target); });
    return nodes.filter((n) => withEdges.has(n.id));
  }, [nodes, edges]);

  // Group by status for visual layout
  const nodesByStatus = useMemo(() => {
    const groups: Record<string, Node[]> = {};
    const displayNodes = selectedNode ? [selectedNode, ...connectedEips] : connectedNodes;
    for (const n of displayNodes) {
      if (!groups[n.status]) groups[n.status] = [];
      groups[n.status].push(n);
    }
    return groups;
  }, [connectedNodes, selectedNode, connectedEips]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <Link href="/tools" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-2">
            <ArrowLeft className="h-4 w-4" />Back to Tools
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="dec-title bg-linear-to-br from-emerald-600 via-slate-700 to-cyan-600 dark:from-emerald-300 dark:via-slate-100 dark:to-cyan-200 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">EIP Dependency Graph</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {connectedNodes.length} EIPs with {edges.length} relationships (via shared PRs)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Focus on EIP #..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-44"
                />
              </div>
              {searchEip && (
                <button onClick={() => { setSearchEip(undefined); setSearch(""); setSelectedNode(null); }}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
                  <X className="h-3 w-3" />Clear
                </button>
              )}
              <select value={repo ?? "all"} onChange={(e) => setRepo(e.target.value === "all" ? undefined : e.target.value as "eips" | "ercs" | "rips")}
                className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500/50">
                <option value="all">All Repos</option>
                <option value="eips">EIPs</option>
                <option value="ercs">ERCs</option>
                <option value="rips">RIPs</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>
        ) : (
          <>
            {/* Selected node detail */}
            {selectedNode && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    EIP-{selectedNode.id}: {selectedNode.title || "Untitled"}
                  </h3>
                  <button onClick={() => setSelectedNode(null)} className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1">
                    <X className="h-3 w-3" />Deselect
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${STATUS_COLORS[selectedNode.status] ?? "#94a3b8"}20`, color: STATUS_COLORS[selectedNode.status] ?? "#94a3b8" }}>
                    {selectedNode.status}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{selectedNode.repo.toUpperCase()}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{connectedEips.length} connected EIP{connectedEips.length !== 1 ? "s" : ""}</span>
                </div>
                {connectedEips.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {connectedEips.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => setSelectedNode(n)}
                        className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-cyan-500/30 transition-colors"
                      >
                        #{n.id} — {n.title?.slice(0, 40) || "Untitled"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Graph visualization (grouped by status) */}
            {Object.keys(nodesByStatus).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(nodesByStatus).map(([status, statusNodes]) => (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] ?? "#94a3b8" }} />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{status}</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{statusNodes.length}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                      {statusNodes.slice(0, 50).map((node) => {
                        const nodeEdges = edges.filter((e) => e.source === node.id || e.target === node.id);
                        const isSelected = selectedNode?.id === node.id;
                        return (
                          <button
                            key={node.id}
                            onClick={() => setSelectedNode(isSelected ? null : node)}
                            className={cn(
                              "text-left rounded-lg border p-3 transition-all hover:-translate-y-0.5",
                              isSelected
                                ? "border-cyan-400/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                                : "border-slate-700/30 bg-slate-100 dark:bg-slate-800/30 hover:border-slate-600/50"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">#{node.id}</span>
                              {nodeEdges.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                  <GitBranch className="h-2.5 w-2.5" />{nodeEdges.length}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-snug">
                              {node.title || "Untitled"}
                            </p>
                          </button>
                        );
                      })}
                      {statusNodes.length > 50 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center">+{statusNodes.length - 50} more</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <GitBranch className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-lg text-slate-600 dark:text-slate-400">No relationships found</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try a different filter or search for a specific EIP</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
