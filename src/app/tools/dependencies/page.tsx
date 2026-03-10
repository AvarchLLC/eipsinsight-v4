"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { client } from "@/lib/orpc";
import { ArrowLeft, GitBranch, Info, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Node = { id: number; title: string | null; status: string; repo: string };
type Edge = { source: number; target: number };

const STATUS_COLORS: Record<string, string> = {
  Draft: "#22d3ee",
  Review: "#60a5fa",
  "Last Call": "#fbbf24",
  Final: "#34d399",
  Stagnant: "#94a3b8",
  Withdrawn: "#ef4444",
  Living: "#a78bfa",
};

export default function DependenciesPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [repo, setRepo] = useState<"eips" | "ercs" | "rips" | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [searchEip, setSearchEip] = useState<number | undefined>(undefined);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [focusDepth, setFocusDepth] = useState<1 | 2>(1);
  const [showLabels, setShowLabels] = useState(false);
  const [showCrossLinks, setShowCrossLinks] = useState(false);
  const [neighborLimit, setNeighborLimit] = useState(25);
  const [viaNodeId, setViaNodeId] = useState<number | null>(null);
  const [graphMode, setGraphMode] = useState<"3d" | "2d">("3d");
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await client.tools.getDependencyGraph({ repo, eipNumber: searchEip });
        setNodes(data.nodes);
        setEdges(data.edges);
      } catch (err) {
        console.error(err);
        setNodes([]);
        setEdges([]);
        setLoadError("Could not load dependency graph data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [repo, searchEip]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const adjacency = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const n of nodes) map.set(n.id, new Set<number>());
    for (const e of edges) {
      if (!map.has(e.source)) map.set(e.source, new Set<number>());
      if (!map.has(e.target)) map.set(e.target, new Set<number>());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }, [nodes, edges]);

  const degreeMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const [id, neighbors] of adjacency.entries()) map.set(id, neighbors.size);
    return map;
  }, [adjacency]);

  const connectedNodes = useMemo(() => {
    const withEdges = new Set<number>();
    edges.forEach((e) => {
      withEdges.add(e.source);
      withEdges.add(e.target);
    });
    return nodes.filter((n) => withEdges.has(n.id));
  }, [nodes, edges]);

  const searchableNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return connectedNodes;
    return connectedNodes.filter(
      (n) =>
        String(n.id).includes(q) ||
        (n.title || "").toLowerCase().includes(q)
    );
  }, [connectedNodes, search]);

  const topHubs = useMemo(
    () =>
      [...connectedNodes]
        .sort((a, b) => (degreeMap.get(b.id) || 0) - (degreeMap.get(a.id) || 0))
        .slice(0, 12),
    [connectedNodes, degreeMap]
  );

  useEffect(() => {
    if (!selectedNode && connectedNodes.length > 0) {
      setSelectedNode(topHubs[0] ?? connectedNodes[0]);
    } else if (selectedNode && !nodeMap.has(selectedNode.id)) {
      setSelectedNode(connectedNodes[0] ?? null);
    }
  }, [selectedNode, connectedNodes, nodeMap, topHubs]);

  useEffect(() => {
    setNeighborLimit(25);
    setViaNodeId(null);
  }, [selectedNode?.id, focusDepth]);

  const handleSearch = () => {
    const num = parseInt(search.replace(/[^0-9]/g, ""), 10);
    setSearchEip(Number.isNaN(num) ? undefined : num);
  };

  const selectedNeighborIds = useMemo(() => {
    if (!selectedNode) return new Set<number>();
    const first = [...(adjacency.get(selectedNode.id) ?? new Set<number>())]
      .sort((a, b) => (degreeMap.get(b) || 0) - (degreeMap.get(a) || 0));
    return new Set(first.slice(0, neighborLimit));
  }, [selectedNode, adjacency, degreeMap, neighborLimit]);

  const focusedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<number>();
    const out = new Set<number>([selectedNode.id, ...selectedNeighborIds]);
    if (focusDepth === 2 && viaNodeId != null) {
      const secondHop = [...(adjacency.get(viaNodeId) ?? new Set<number>())]
        .filter((id) => id !== selectedNode.id)
        .sort((a, b) => (degreeMap.get(b) || 0) - (degreeMap.get(a) || 0))
        .slice(0, neighborLimit);
      secondHop.forEach((id) => out.add(id));
    }
    return out;
  }, [selectedNode, selectedNeighborIds, focusDepth, viaNodeId, adjacency, degreeMap, neighborLimit]);

  const focusedNodes = useMemo(
    () => nodes.filter((n) => focusedNodeIds.has(n.id)),
    [nodes, focusedNodeIds]
  );

  const focusedEdges = useMemo(
    () => {
      if (!selectedNode) return [];
      const sid = selectedNode.id;
      return edges.filter((e) => {
        const inScope = focusedNodeIds.has(e.source) && focusedNodeIds.has(e.target);
        if (!inScope) return false;
        if (showCrossLinks) return true;
        return e.source === sid || e.target === sid || (viaNodeId != null && (e.source === viaNodeId || e.target === viaNodeId));
      });
    },
    [edges, focusedNodeIds, selectedNode, showCrossLinks, viaNodeId]
  );

  const connectedEips = useMemo(() => {
    if (!selectedNode) return [];
    const neighbors = adjacency.get(selectedNode.id) ?? new Set<number>();
    return [...neighbors]
      .map((id) => nodeMap.get(id))
      .filter((n): n is Node => !!n)
      .sort((a, b) => (degreeMap.get(b.id) || 0) - (degreeMap.get(a.id) || 0));
  }, [selectedNode, adjacency, nodeMap, degreeMap]);

  const firstHopIds = useMemo(
    () => [...selectedNeighborIds].sort((a, b) => (degreeMap.get(b) || 0) - (degreeMap.get(a) || 0)),
    [selectedNeighborIds, degreeMap]
  );

  const secondHopIds = useMemo(() => {
    if (!selectedNode) return [] as number[];
    return [...focusedNodeIds]
      .filter((id) => id !== selectedNode.id && !selectedNeighborIds.has(id))
      .sort((a, b) => (degreeMap.get(b) || 0) - (degreeMap.get(a) || 0));
  }, [focusedNodeIds, selectedNeighborIds, selectedNode, degreeMap]);

  const positionMap = useMemo(() => {
    const map = new Map<number, [number, number, number]>();
    if (!selectedNode) return map;

    const seedJitter = (id: number) => {
      const v = Math.sin(id * 12.9898) * 43758.5453;
      return (v - Math.floor(v)) - 0.5;
    };

    const placeOnSphere = (ids: number[], radius: number, jitter = 0.08) => {
      const n = ids.length;
      if (n === 0) return;
      const golden = Math.PI * (3 - Math.sqrt(5));
      ids.forEach((id, i) => {
        const y = 1 - (i / Math.max(1, n - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = golden * i;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const j = seedJitter(id) * jitter;
        map.set(id, [(x + j) * radius, (y + j) * radius, (z - j) * radius]);
      });
    };

    map.set(selectedNode.id, [0, 0, 0]);
    placeOnSphere(firstHopIds, 22, 0.06);
    placeOnSphere(secondHopIds, 38, 0.05);
    return map;
  }, [selectedNode, firstHopIds, secondHopIds]);

  const graphOption = useMemo(() => {
    const seriesNodes = focusedNodes.map((n) => {
      const isSelected = selectedNode?.id === n.id;
      return {
        id: String(n.id),
        name: `#${n.id}`,
        value: degreeMap.get(n.id) || 0,
        symbolSize: isSelected ? 40 : Math.max(16, Math.min(34, 10 + (degreeMap.get(n.id) || 0) * 2)),
        itemStyle: {
          color: STATUS_COLORS[n.status] || "#94a3b8",
          borderColor: isSelected ? "#f8fafc" : "rgba(148,163,184,0.35)",
          borderWidth: isSelected ? 2.2 : 1,
        },
        label: {
          show: showLabels || isSelected,
          color: "#e2e8f0",
          fontSize: isSelected ? 12 : 10,
          formatter: showLabels ? `#${n.id}` : isSelected ? `#${n.id}` : "",
        },
      };
    });

    const seriesLinks = focusedEdges.map((e) => ({
      source: String(e.source),
      target: String(e.target),
      lineStyle: {
        color:
          selectedNode && (e.source === selectedNode.id || e.target === selectedNode.id)
            ? "rgba(56,189,248,0.75)"
            : "rgba(148,163,184,0.3)",
        width:
          selectedNode && (e.source === selectedNode.id || e.target === selectedNode.id)
            ? 1.8
            : 1,
      },
    }));

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(15,23,42,0.96)",
        borderColor: "rgba(148,163,184,0.25)",
        textStyle: { color: "#e2e8f0", fontSize: 12 },
        formatter: (params: { dataType: string; data: { id?: string; source?: string; target?: string } }) => {
          if (params.dataType === "edge") return `Link: #${params.data.source} ↔ #${params.data.target}`;
          const node = nodeMap.get(Number(params.data.id));
          if (!node) return "";
          return `#${node.id}<br/>${node.title || "Untitled"}<br/>${node.status}`;
        },
      },
      animationDurationUpdate: 250,
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          draggable: true,
          data: seriesNodes,
          links: seriesLinks,
          force: {
            repulsion: 150,
            edgeLength: [35, 90],
            gravity: 0.08,
          },
          lineStyle: { opacity: 0.85, curveness: 0.02 },
          emphasis: { focus: "adjacency" },
        },
      ],
    };
  }, [focusedNodes, focusedEdges, selectedNode, showLabels, degreeMap, nodeMap]);

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 py-5 sm:px-6 lg:px-8 xl:px-12">
        <header className="mb-5">
          <Link
            href="/tools"
            className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tools
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
                Proposal Dependencies
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Explore connected EIPs/ERCs/RIPs through shared PR linkage. Start from a hub, inspect 1-hop or 2-hop neighborhoods, and identify bridge proposals.
              </p>
            </div>
            <button
              onClick={() => setShowGuide((p) => !p)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 text-sm text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <Info className="h-4 w-4" />
              {showGuide ? "Hide guide" : "What does this show?"}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-border bg-card/60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : loadError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {loadError}
          </div>
        ) : (
          <div className="space-y-4">
            {showGuide && (
              <section className="rounded-xl border border-border bg-card/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">How To Read</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1-hop</p>
                    <p className="mt-1 text-xs text-muted-foreground">Direct neighbors connected to the selected proposal.</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">2-hop</p>
                    <p className="mt-1 text-xs text-muted-foreground">Explore second-order paths via a chosen neighbor.</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cross-links</p>
                    <p className="mt-1 text-xs text-muted-foreground">Show neighbor-to-neighbor links for dense-cluster analysis.</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hub Score</p>
                    <p className="mt-1 text-xs text-muted-foreground">Chain count indicates degree, the number of connected proposals.</p>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-xl border border-border bg-card/60 p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <label className="md:col-span-2">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Search proposal</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="EIP number or title..."
                      className="h-9 w-full rounded-md border border-border bg-muted/60 py-1 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </label>
                <label>
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repo</span>
                  <select
                    value={repo ?? "all"}
                    onChange={(e) =>
                      setRepo(e.target.value === "all" ? undefined : (e.target.value as "eips" | "ercs" | "rips"))
                    }
                    className="h-9 w-full rounded-md border border-border bg-muted/60 px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="all">All Repos</option>
                    <option value="eips">EIPs</option>
                    <option value="ercs">ERCs</option>
                    <option value="rips">RIPs</option>
                  </select>
                </label>
                <div className="flex items-end gap-2">
                  <button
                    onClick={handleSearch}
                    className="h-9 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm text-primary transition hover:bg-primary/15"
                  >
                    Apply
                  </button>
                  {(searchEip || search) && (
                    <button
                      onClick={() => {
                        setSearchEip(undefined);
                        setSearch("");
                      }}
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Connected proposals</p>
                  <p className="text-sm font-semibold text-foreground">{connectedNodes.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Links</p>
                  <p className="text-sm font-semibold text-foreground">{edges.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Focus node</p>
                  <p className="text-sm font-semibold text-foreground">{selectedNode ? `#${selectedNode.id}` : "None"}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Visible nodes</p>
                  <p className="text-sm font-semibold text-foreground">{focusedNodes.length}</p>
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-12">
            <section className="rounded-xl border border-border bg-card/60 p-3 xl:col-span-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Overview</p>
              <p className="mt-1 text-xs text-muted-foreground">Top hubs (highest degree)</p>
              <div className="mt-2 space-y-1.5">
                {topHubs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNode(n)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition-colors",
                      selectedNode?.id === n.id
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/30 hover:bg-primary/5"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-foreground">#{n.id}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{n.title || "Untitled"}</span>
                    </span>
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <GitBranch className="h-3 w-3" />
                      {degreeMap.get(n.id) || 0}
                    </span>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Search Results</p>
              <div className="mt-2 max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
                {searchableNodes.slice(0, 30).map((n) => (
                  <button
                    key={`sr-${n.id}`}
                    onClick={() => setSelectedNode(n)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                      selectedNode?.id === n.id
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-muted/20 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    #{n.id} — {n.title?.slice(0, 46) || "Untitled"}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4 xl:col-span-9">
              <div className="rounded-xl border border-border bg-card/60 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Focus Graph {selectedNode ? `(EIP-${selectedNode.id})` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex overflow-hidden rounded-lg border border-border">
                      <button
                        onClick={() => setGraphMode("3d")}
                        className={cn(
                          "px-2 py-1 text-xs",
                          graphMode === "3d" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        3D
                      </button>
                      <button
                        onClick={() => setGraphMode("2d")}
                        className={cn(
                          "border-l border-border px-2 py-1 text-xs",
                          graphMode === "2d" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        2D
                      </button>
                    </div>
                    <div className="inline-flex overflow-hidden rounded-lg border border-border">
                      <button
                        onClick={() => setFocusDepth(1)}
                        className={cn(
                          "px-2 py-1 text-xs",
                          focusDepth === 1 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        1-hop
                      </button>
                      <button
                        onClick={() => setFocusDepth(2)}
                        className={cn(
                          "border-l border-border px-2 py-1 text-xs",
                          focusDepth === 2 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        2-hop
                      </button>
                    </div>
                    <button
                      onClick={() => setShowLabels((p) => !p)}
                      className="rounded-lg border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showLabels ? "Hide labels" : "Show labels"}
                    </button>
                    <button
                      onClick={() => setShowCrossLinks((p) => !p)}
                      className={cn(
                        "rounded-lg border px-2 py-1 text-xs",
                        showCrossLinks
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {showCrossLinks ? "Hide cross-links" : "Show cross-links"}
                    </button>
                  </div>
                </div>
                <div className="h-[460px] rounded-lg border border-border/60 bg-muted/15">
                  {focusedNodes.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Select a node to render the graph.
                    </div>
                  ) : graphMode === "2d" ? (
                    <ReactECharts
                      option={graphOption}
                      style={{ height: "100%", width: "100%" }}
                      onEvents={{
                        click: (params: { dataType?: string; data?: { id?: string } }) => {
                          if (params?.dataType !== "node" || !params?.data?.id) return;
                          const n = nodeMap.get(Number(params.data.id));
                          if (n) setSelectedNode(n);
                        },
                      }}
                    />
                  ) : (
                    <Canvas
                      camera={{ position: [0, 0, 95], fov: 48 }}
                      className="h-full w-full rounded-lg"
                    >
                      <ambientLight intensity={0.6} />
                      <pointLight position={[20, 22, 28]} intensity={0.85} />
                      <pointLight position={[-18, -15, -22]} intensity={0.35} />

                      {focusedEdges.map((e, idx) => {
                        const p1 = positionMap.get(e.source);
                        const p2 = positionMap.get(e.target);
                        if (!p1 || !p2) return null;
                        const primary =
                          selectedNode &&
                          (e.source === selectedNode.id || e.target === selectedNode.id);
                        return (
                          <Line
                            key={`edge3d-${idx}-${e.source}-${e.target}`}
                            points={[p1, p2]}
                            color={primary ? "#38bdf8" : "rgba(148,163,184,0.45)"}
                            lineWidth={primary ? 1.7 : 1}
                            transparent
                            opacity={primary ? 0.85 : 0.28}
                          />
                        );
                      })}

                      {focusedNodes.map((n) => {
                        const p = positionMap.get(n.id);
                        if (!p) return null;
                        const isSelected = selectedNode?.id === n.id;
                        const size = isSelected
                          ? 3.5
                          : Math.max(1.3, Math.min(2.8, 1 + (degreeMap.get(n.id) || 0) * 0.06));
                        return (
                          <group key={`node3d-${n.id}`} position={p}>
                            <mesh onClick={() => setSelectedNode(n)}>
                              <sphereGeometry args={[size, 24, 24]} />
                              <meshStandardMaterial
                                color={STATUS_COLORS[n.status] || "#94a3b8"}
                                emissive={isSelected ? "#22d3ee" : "#000000"}
                                emissiveIntensity={isSelected ? 0.28 : 0}
                                roughness={0.35}
                                metalness={0.05}
                              />
                            </mesh>
                            {(showLabels || isSelected) && (
                              <Html position={[0, size + 1.5, 0]} center>
                                <div className="rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                                  #{n.id}
                                </div>
                              </Html>
                            )}
                          </group>
                        );
                      })}

                      <OrbitControls
                        makeDefault
                        enablePan
                        enableZoom
                        minDistance={28}
                        maxDistance={170}
                        autoRotate={false}
                      />
                    </Canvas>
                  )}
                </div>
              </div>

              {selectedNode && (
                <div className="rounded-xl border border-border bg-card/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      Connected to EIP-{selectedNode.id}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {connectedEips.length} neighbor{connectedEips.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Neighbors shown: {Math.min(neighborLimit, connectedEips.length)} / {connectedEips.length}</span>
                    {connectedEips.length > neighborLimit && (
                      <button
                        onClick={() => setNeighborLimit((v) => v + 25)}
                        className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Show more (+25)
                      </button>
                    )}
                    {neighborLimit > 25 && (
                      <button
                        onClick={() => setNeighborLimit(25)}
                        className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Reset
                      </button>
                    )}
                    {focusDepth === 2 && (
                      <span className="text-xs text-muted-foreground">
                        {viaNodeId ? `2-hop via #${viaNodeId}` : "Pick a neighbor to explore 2-hop"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {connectedEips.slice(0, neighborLimit).map((n) => (
                      <div key={`n-${n.id}`} className="inline-flex items-center overflow-hidden rounded-md border border-border bg-muted/30">
                        <button
                          onClick={() => setSelectedNode(n)}
                          className="px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
                        >
                          #{n.id} — {n.title?.slice(0, 38) || "Untitled"}
                        </button>
                        {focusDepth === 2 && (
                          <button
                            onClick={() => setViaNodeId(n.id)}
                            className={cn(
                              "border-l border-border px-2 py-1 text-[10px]",
                              viaNodeId === n.id
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            via
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
            </div>

            <section className="rounded-xl border border-border bg-card/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status Colors</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <span
                    key={status}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {status}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
