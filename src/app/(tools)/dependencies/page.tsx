"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  GitBranch,
  Network,
  Search,
  Sparkles,
} from "lucide-react";

import { upgradeDependencies } from "@/data/upgrade-dependencies";
import { eipTitles } from "@/data/network-upgrades";
import { cn } from "@/lib/utils";

type UpgradeName = (typeof upgradeDependencies)[number]["name"];
type UpgradeFilter = UpgradeName | "All";
type ViewMode = "highlight" | "isolate" | "neighborhood";
type LabelMode = "auto" | "important" | "all" | "none";
type GraphNode = {
  id: number;
  name: string;
  category: UpgradeName | "External";
  title: string;
  directDependencies: number[];
  transitiveDependencies: number[];
  isExternal: boolean;
};
type GraphLink = {
  source: number;
  target: number;
  kind: "direct" | "transitive";
  originUpgrade: UpgradeName;
};

const UPGRADE_COLORS: Record<string, string> = {
  Fusaka: "#10b981",
  Pectra: "#f97316",
  Dencun: "#3b82f6",
  Shanghai: "#14b8a6",
  Paris: "#8b5cf6",
  London: "#ec4899",
  Berlin: "#f59e0b",
  Istanbul: "#06b6d4",
  Constantinople: "#6366f1",
  Byzantium: "#22c55e",
  "Spurious Dragon": "#0ea5e9",
  "Tangerine Whistle": "#f97316",
  Homestead: "#a16207",
  "Muir Glacier": "#ef4444",
  "Arrow Glacier": "#e11d48",
  "Gray Glacier": "#64748b",
  External: "#94a3b8",
};

const UPGRADE_NOTES: Partial<Record<UpgradeName, string>> = {
  Fusaka: "PeerDAS-era scaling and post-4844 follow-through.",
  Pectra: "Account model and validator operations reshape the stack.",
  Dencun: "Proto-danksharding lands and touches fee and blob primitives.",
  Shanghai: "Withdrawals and EVM ergonomics with a smaller dependency surface.",
  Paris: "Merge cutover dependencies center on consensus transition semantics.",
  London: "1559-era fee market changes become a base layer for later upgrades.",
  Berlin: "Transaction envelope and access list primitives feed many later forks.",
  Istanbul: "Crypto and gas repricing work introduces several reusable building blocks.",
};

const CHRONOLOGICAL_ORDER: UpgradeName[] = upgradeDependencies.map((upgrade) => upgrade.name).reverse();

function getTransitiveDependencies(
  eipId: number,
  dependencyMap: Map<number, number[]>,
  visited = new Set<number>()
): number[] {
  if (visited.has(eipId)) return [];
  visited.add(eipId);

  const direct = dependencyMap.get(eipId) ?? [];
  const results = new Set<number>();

  direct.forEach((dep) => {
    results.add(dep);
    getTransitiveDependencies(dep, dependencyMap, new Set(visited)).forEach((nested) => results.add(nested));
  });

  return [...results];
}

export default function DependenciesPage() {
  const chartRef = useRef<ReactECharts>(null);
  const [selectedUpgrade, setSelectedUpgrade] = useState<UpgradeFilter>("All");
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(7702);
  const [search, setSearch] = useState("");
  const [showTransitive, setShowTransitive] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("highlight");
  const [labelMode, setLabelMode] = useState<LabelMode>("important");
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  const dependencyMap = useMemo(() => {
    const map = new Map<number, number[]>();
    upgradeDependencies.forEach((upgrade) => {
      upgrade.eips.forEach(({ eip, requires }) => {
        map.set(eip, requires);
      });
    });
    return map;
  }, []);

  const upgradeForEip = useMemo(() => {
    const map = new Map<number, UpgradeName>();
    upgradeDependencies.forEach((upgrade) => {
      upgrade.eips.forEach(({ eip }) => {
        map.set(eip, upgrade.name);
      });
    });
    return map;
  }, []);

  const allNodes = useMemo(() => {
    const nodes = new Map<number, GraphNode>();

    upgradeDependencies.forEach((upgrade) => {
      upgrade.eips.forEach(({ eip, requires }) => {
        nodes.set(eip, {
          id: eip,
          name: `EIP-${eip}`,
          category: upgrade.name,
          title: eipTitles[String(eip)]?.title ?? "Dependency reference",
          directDependencies: requires,
          transitiveDependencies: getTransitiveDependencies(eip, dependencyMap),
          isExternal: false,
        });

        requires.forEach((dep) => {
          if (!nodes.has(dep)) {
            nodes.set(dep, {
              id: dep,
              name: `EIP-${dep}`,
              category: upgradeForEip.get(dep) ?? "External",
              title: eipTitles[String(dep)]?.title ?? "Dependency reference",
              directDependencies: dependencyMap.get(dep) ?? [],
              transitiveDependencies: getTransitiveDependencies(dep, dependencyMap),
              isExternal: !upgradeForEip.has(dep),
            });
          }
        });
      });
    });

    return [...nodes.values()];
  }, [dependencyMap, upgradeForEip]);

  const graphData = useMemo(() => {
    const links: GraphLink[] = [];

    upgradeDependencies.forEach((upgrade) => {
      upgrade.eips.forEach(({ eip, requires }) => {
        const dependencyIds = showTransitive ? getTransitiveDependencies(eip, dependencyMap) : requires;
        dependencyIds.forEach((dep) => {
          links.push({
            source: eip,
            target: dep,
            kind: requires.includes(dep) ? "direct" : "transitive",
            originUpgrade: upgrade.name,
          });
        });
      });
    });

    return { nodes: allNodes, links };
  }, [allNodes, dependencyMap, showTransitive]);

  const searchedIds = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return new Set<number>();
    return new Set(
      graphData.nodes
        .filter(
          (node) =>
            node.name.toLowerCase().includes(query) ||
            node.title.toLowerCase().includes(query) ||
            node.category.toLowerCase().includes(query)
        )
        .map((node) => node.id)
    );
  }, [graphData.nodes, search]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return graphData.nodes
      .filter((node) => searchedIds.has(node.id))
      .sort((a, b) => a.id - b.id)
      .slice(0, 6);
  }, [graphData.nodes, search, searchedIds]);

  const selectedNode = useMemo(() => {
    const activeId =
      selectedNodeId && graphData.nodes.some((node) => node.id === selectedNodeId)
        ? selectedNodeId
        : searchResults[0]?.id ??
          (selectedUpgrade !== "All" ? upgradeDependencies.find((upgrade) => upgrade.name === selectedUpgrade)?.eips[0]?.eip : null) ??
          graphData.nodes[0]?.id ??
          null;

    return graphData.nodes.find((node) => node.id === activeId) ?? null;
  }, [graphData.nodes, searchResults, selectedNodeId, selectedUpgrade]);

  const neighborhoodNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<number>();
    return new Set<number>([
      selectedNode.id,
      ...selectedNode.directDependencies,
      ...selectedNode.transitiveDependencies,
      ...graphData.links
        .filter((link) => link.target === selectedNode.id || link.source === selectedNode.id)
        .map((link) => (link.target === selectedNode.id ? link.source : link.target)),
    ]);
  }, [graphData.links, selectedNode]);

  const highlightedNodeIds = useMemo(() => {
    if (viewMode === "neighborhood") return neighborhoodNodeIds;
    if (searchedIds.size) return searchedIds;
    if (selectedUpgrade === "All") return new Set<number>();
    return new Set(graphData.nodes.filter((node) => node.category === selectedUpgrade || node.isExternal).map((node) => node.id));
  }, [graphData.nodes, neighborhoodNodeIds, searchedIds, selectedUpgrade, viewMode]);

  const summary = useMemo(() => {
    const upgradeCount = upgradeDependencies.filter((upgrade) => upgrade.eips.length > 0).length;
    const sharedDependencies = graphData.nodes.filter(
      (node) => graphData.links.filter((link) => link.target === node.id).length > 1
    ).length;
    return {
      upgrades: upgradeCount,
      eips: graphData.nodes.filter((node) => !node.isExternal).length,
      sharedDependencies,
      links: graphData.links.length,
    };
  }, [graphData.links, graphData.nodes]);

  const visibleNodeIds = useMemo(() => {
    if (viewMode === "isolate" && selectedUpgrade !== "All") {
      return new Set(
        graphData.nodes
          .filter((node) => node.category === selectedUpgrade || graphData.links.some((link) => link.source === node.id || link.target === node.id))
          .map((node) => node.id)
      );
    }
    if (viewMode === "neighborhood") return neighborhoodNodeIds;
    return new Set(graphData.nodes.map((node) => node.id));
  }, [graphData.links, graphData.nodes, neighborhoodNodeIds, selectedUpgrade, viewMode]);

  const option = useMemo(() => {
    const categories = [
      ...CHRONOLOGICAL_ORDER.filter((upgrade) => graphData.nodes.some((node) => node.category === upgrade)).map((name) => ({
        name,
        itemStyle: { color: UPGRADE_COLORS[name] ?? "#94a3b8" },
      })),
      ...(graphData.nodes.some((node) => node.category === "External")
        ? [{ name: "External", itemStyle: { color: UPGRADE_COLORS.External } }]
        : []),
    ];

    return {
      animationDurationUpdate: 250,
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(15,23,42,0.96)",
        borderColor: "rgba(148,163,184,0.25)",
        textStyle: { color: "#e2e8f0", fontSize: 12 },
        formatter: (params: { dataType: string; data: GraphNode | GraphLink }) => {
          if (params.dataType === "edge") {
            const link = params.data as GraphLink;
            return `${link.kind === "direct" ? "Direct" : "Transitive"} dependency<br/>${link.originUpgrade}<br/>EIP-${link.source} → EIP-${link.target}`;
          }

          const node = params.data as GraphNode;
          return `${node.name}<br/>${node.title}<br/>${node.category}`;
        },
      },
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          zoom: 1.1,
          scaleLimit: {
            min: 0.3,
            max: 4,
          },
          draggable: true,
          focusNodeAdjacency: true,
          data: graphData.nodes.map((node) => {
            const isSelected = node.id === selectedNode?.id;
            const isSearchHit = searchedIds.has(node.id);
            const isHighlighted = highlightedNodeIds.has(node.id);
            const isVisible = visibleNodeIds.has(node.id);
            const isTopHub =
              graphData.links.filter((link) => link.source === node.id || link.target === node.id).length >= 4;
            const isDimmed =
              (selectedUpgrade !== "All" || searchedIds.size > 0 || viewMode !== "highlight") &&
              !isSelected &&
              !isHighlighted &&
              !isSearchHit;
            const degree = graphData.links.filter((link) => link.source === node.id || link.target === node.id).length;
            const showLabel =
              labelMode === "all"
                ? true
                : labelMode === "none"
                  ? false
                  : labelMode === "important"
                    ? isSelected || isSearchHit || isTopHub
                    : isSelected || isSearchHit || (!isDimmed && isTopHub);

            return {
              id: String(node.id),
              name: node.name,
              category: categories.findIndex((category) => category.name === node.category),
              symbolSize: isSelected ? 44 : isSearchHit ? 34 : node.isExternal ? 20 : 24 + Math.min(10, degree * 1.7),
              value: degree,
              itemStyle: {
                color: UPGRADE_COLORS[node.category] ?? "#94a3b8",
                borderColor: isSelected ? "#f8fafc" : isSearchHit ? "#facc15" : "rgba(255,255,255,0.22)",
                borderWidth: isSelected ? 3 : isSearchHit ? 2 : 1,
                opacity: !isVisible ? 0.05 : isDimmed ? 0.1 : node.isExternal ? 0.9 : 1,
                shadowBlur: isSelected || isSearchHit ? 20 : 0,
                shadowColor: isSearchHit ? "rgba(250,204,21,0.35)" : "rgba(248,250,252,0.3)",
              },
              label: {
                show: showLabel,
                color: "#e5eef7",
                fontSize: isSelected ? 13 : 11,
                formatter: node.name,
              },
            };
          }),
          categories,
          links: graphData.links.map((link) => {
            const isVisible = visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target);
            const relatesToSelectedUpgrade =
              selectedUpgrade === "All" ||
              link.originUpgrade === selectedUpgrade ||
              upgradeForEip.get(link.target) === selectedUpgrade ||
              upgradeForEip.get(link.source) === selectedUpgrade;
            const relatesToSearch =
              searchedIds.size === 0 || searchedIds.has(link.source) || searchedIds.has(link.target);
            const dimmed = !relatesToSelectedUpgrade || !relatesToSearch;

            return {
              source: String(link.source),
              target: String(link.target),
              lineStyle: {
                color: link.kind === "direct" ? "rgba(56,189,248,0.82)" : "rgba(148,163,184,0.34)",
                width: link.kind === "direct" ? 2.1 : 1.1,
                type: link.kind === "direct" ? "solid" : "dashed",
                opacity: !isVisible ? 0.04 : dimmed ? 0.08 : 1,
                curveness: 0.06,
              },
            };
          }),
          force: {
            repulsion: 420,
            edgeLength: [80, 160],
            gravity: 0.03,
            friction: 0.6,
          },
          emphasis: {
            focus: "adjacency",
            lineStyle: { width: 3 },
          },
        },
      ],
    };
  }, [graphData, highlightedNodeIds, labelMode, searchedIds, selectedNode, selectedUpgrade, upgradeForEip, viewMode, visibleNodeIds]);

  const selectedUpgradeData = useMemo(
    () => (selectedUpgrade === "All" ? null : upgradeDependencies.find((upgrade) => upgrade.name === selectedUpgrade) ?? null),
    [selectedUpgrade]
  );

  const relatedUpgrades = useMemo(() => {
    if (!selectedNode) return [];
    const upgrades = new Set<UpgradeName>();
    selectedNode.directDependencies.forEach((dep) => {
      const upgrade = upgradeForEip.get(dep);
      if (upgrade && upgrade !== selectedNode.category) upgrades.add(upgrade);
    });
    return [...upgrades];
  }, [selectedNode, upgradeForEip]);

  const upgradeMembership = useMemo(() => {
    if (!selectedNode) return [] as UpgradeName[];
    return upgradeDependencies
      .filter((upgrade) => upgrade.eips.some((item) => item.eip === selectedNode.id))
      .map((upgrade) => upgrade.name);
  }, [selectedNode]);

  const usedByCount = useMemo(() => {
    if (!selectedNode) return 0;
    return graphData.links.filter((link) => link.target === selectedNode.id).length;
  }, [graphData.links, selectedNode]);

  const roleSummary = useMemo(() => {
    if (!selectedNode) return "Select a node";
    if (selectedNode.isExternal) return "External reference";
    if (upgradeMembership.length > 1) return "Shared dependency";
    if (usedByCount >= 3) return "Foundational building block";
    if (relatedUpgrades.length > 0) return "Cross-upgrade bridge";
    return "Upgrade-local node";
  }, [relatedUpgrades.length, selectedNode, upgradeMembership.length, usedByCount]);

  const activeUpgradeStats = useMemo(() => {
    const upgradesToUse =
      selectedUpgrade === "All"
        ? upgradeDependencies.filter((upgrade) => upgrade.eips.length > 0)
        : upgradeDependencies.filter((upgrade) => upgrade.name === selectedUpgrade);
    const eips = upgradesToUse.flatMap((upgrade) => upgrade.eips);
    const directDeps = eips.reduce((sum, item) => sum + item.requires.length, 0);
    const transitiveDeps = eips.reduce((sum, item) => sum + getTransitiveDependencies(item.eip, dependencyMap).length, 0);
    const externalRefs = new Set(
      eips.flatMap((item) => item.requires).filter((dep) => !upgradeForEip.has(dep))
    ).size;
    const reused = new Map<number, number>();
    graphData.links.forEach((link) => {
      if (selectedUpgrade !== "All" && link.originUpgrade !== selectedUpgrade) return;
      reused.set(link.target, (reused.get(link.target) ?? 0) + 1);
    });
    const topDependency = [...reused.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      eips: eips.length,
      directDeps,
      transitiveDeps,
      externalRefs,
      topDependency,
    };
  }, [dependencyMap, graphData.links, selectedUpgrade, upgradeForEip]);

  const handleResetView = () => {
    chartRef.current?.getEchartsInstance().dispatchAction({ type: "restore" });
  };

  const handleFitGraph = () => {
    const chart = chartRef.current?.getEchartsInstance();
    chart?.resize();
    chart?.dispatchAction({ type: "restore" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-shell py-6">
        <header className="mb-6">
          <Link
            href="/tools"
            className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tools
          </Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
                Upgrade Dependencies
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Track how hard forks reuse older EIPs, which upgrades contribute the biggest building blocks, and where direct dependencies turn into longer inherited chains.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Middle ground between full graph exploration and upgrade context
            </div>
          </div>
        </header>

        <section className="mb-4 rounded-xl border border-border bg-card/60 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Search upgrade or EIP</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && searchResults[0]) {
                      setSelectedNodeId(searchResults[0].id);
                    }
                  }}
                  placeholder="Pectra, EIP-7702, blob throughput..."
                  className="h-10 w-full rounded-md border border-border bg-muted/60 py-1 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              {search && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{searchResults.length} result{searchResults.length === 1 ? "" : "s"}</span>
                  {searchResults.map((node) => (
                    <button
                      key={`quick-${node.id}`}
                      onClick={() => setSelectedNodeId(node.id)}
                      className="rounded-md border border-border bg-card px-2 py-1 text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
                    >
                      {node.name}
                    </button>
                  ))}
                </div>
              )}
            </label>

            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Graph view</span>
              <div className="inline-flex h-10 overflow-hidden rounded-lg border border-border bg-muted/40">
                {(["highlight", "isolate", "neighborhood"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      "border-l border-border px-3 text-sm capitalize transition-colors first:border-l-0",
                      viewMode === mode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dependency mode</span>
              <div className="inline-flex h-10 overflow-hidden rounded-lg border border-border bg-muted/40">
                <button
                  onClick={() => setShowTransitive(false)}
                  className={cn(
                    "px-3 text-sm transition-colors",
                    !showTransitive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Direct
                </button>
                <button
                  onClick={() => setShowTransitive(true)}
                  className={cn(
                    "border-l border-border px-3 text-sm transition-colors",
                    showTransitive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Transitive
                </button>
              </div>
            </div>

            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Labels</span>
              <div className="inline-flex h-10 overflow-hidden rounded-lg border border-border bg-muted/40">
                {(["auto", "important", "all", "none"] as LabelMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLabelMode(mode)}
                    className={cn(
                      "border-l border-border px-3 text-sm capitalize transition-colors first:border-l-0",
                      labelMode === mode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Upgrades" value={summary.upgrades} icon={<Boxes className="h-4 w-4" />} />
            <StatCard label="Upgrade EIPs" value={summary.eips} icon={<Network className="h-4 w-4" />} />
            <StatCard label="Shared deps" value={summary.sharedDependencies} icon={<GitBranch className="h-4 w-4" />} />
            <StatCard label="Total links" value={summary.links} icon={<Sparkles className="h-4 w-4" />} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
            <span>Node size = dependency degree</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-px w-5 bg-cyan-400" />
              direct
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-px w-5 border-t border-dashed border-slate-400" />
              transitive
            </span>
            <span>Color = upgrade origin</span>
          </div>
        </section>

        <section className="mb-4 rounded-xl border border-border bg-card/60 p-4">
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Upgrade Scope</p>
            <p className="mt-1 text-xs text-muted-foreground">Select an upgrade to highlight or isolate its neighborhood. Keep `All` selected for the full dependency field.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["All", ...CHRONOLOGICAL_ORDER] as UpgradeFilter[]).map((upgrade) => {
              const active = selectedUpgrade === upgrade;
              const count =
                upgrade === "All"
                  ? graphData.nodes.filter((node) => !node.isExternal).length
                  : upgradeDependencies.find((item) => item.name === upgrade)?.eips.length ?? 0;

              return (
                <button
                  key={upgrade}
                  onClick={() => setSelectedUpgrade(upgrade)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-muted/25 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: upgrade === "All" ? "rgb(var(--persona-accent-rgb))" : UPGRADE_COLORS[upgrade] ?? "#94a3b8" }}
                  />
                  <span>{upgrade}</span>
                  <span className="rounded-md bg-background/80 px-1.5 py-0.5 text-[10px]">{count}</span>
                </button>
              );
            })}
          </div>
          {selectedUpgradeData && (
            <div className="mt-3 rounded-lg border border-border bg-muted/25 p-3">
              <p className="text-sm font-semibold text-foreground">{selectedUpgradeData.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{UPGRADE_NOTES[selectedUpgradeData.name] ?? "Curated dependency relationships for this upgrade scope."}</p>
            </div>
          )}
        </section>

        <div className={cn("grid gap-4", inspectorCollapsed ? "xl:grid-cols-[minmax(0,1fr)]" : "xl:grid-cols-[minmax(0,1fr)_340px]")}>
          <section className="rounded-xl border border-border bg-card/60 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dependency Graph</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedUpgrade === "All"
                    ? "Full upgrade graph with search-driven highlights."
                    : `${selectedUpgrade} ${viewMode === "isolate" ? "isolated" : "highlighted"} against the full dependency network.`}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Solid cyan = direct</div>
                <div>Dashed slate = transitive</div>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex overflow-hidden rounded-lg border border-border bg-muted/40">
                <button
                  onClick={handleResetView}
                  className="px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Reset View
                </button>
                <button
                  onClick={handleFitGraph}
                  className="border-l border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Fit Graph
                </button>
                <button
                  onClick={() => setInspectorCollapsed((value) => !value)}
                  className="border-l border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {inspectorCollapsed ? "Show Inspector" : "Hide Inspector"}
                </button>
              </div>
              <div className="text-xs text-muted-foreground">Scroll to zoom, drag to pan, click a node to inspect</div>
            </div>

            <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <MiniStat label="Upgrade EIPs" value={activeUpgradeStats.eips} />
              <MiniStat label="Direct deps" value={activeUpgradeStats.directDeps} />
              <MiniStat label="Inherited deps" value={activeUpgradeStats.transitiveDeps} />
              <MiniStat label="External refs" value={activeUpgradeStats.externalRefs} />
              <MiniStat
                label="Most reused"
                value={activeUpgradeStats.topDependency ? `EIP-${activeUpgradeStats.topDependency[0]}` : "—"}
              />
            </div>

            <div className="h-[70vh] min-h-[720px] rounded-lg bg-muted/10 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[length:24px_24px]">
              <ReactECharts
                ref={chartRef}
                option={option}
                style={{ height: "100%", width: "100%" }}
                onEvents={{
                  click: (params: { dataType?: string; data?: { id?: string } }) => {
                    if (params.dataType !== "node" || !params.data?.id) return;
                    setSelectedNodeId(Number(params.data.id));
                  },
                }}
              />
            </div>
          </section>

          {!inspectorCollapsed && <section className="rounded-xl border border-border bg-card/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inspector</p>
            {selectedNode ? (
              <div className="mt-3 space-y-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-wide text-primary">
                    {selectedNode.category}
                  </div>
                  <div
                    className="mt-3 h-1.5 w-20 rounded-full"
                    style={{ backgroundColor: UPGRADE_COLORS[selectedNode.category] ?? "#94a3b8" }}
                  />
                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{selectedNode.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedNode.title}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wider text-primary">{roleSummary}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <MiniStat label="Direct" value={selectedNode.directDependencies.length} />
                  <MiniStat label="Transitive" value={selectedNode.transitiveDependencies.length} />
                  <MiniStat label="Used by" value={usedByCount} />
                  <MiniStat label="Upgrades" value={upgradeMembership.length || 1} />
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Used in upgrades</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {upgradeMembership.length ? (
                      upgradeMembership.map((upgrade) => (
                        <button
                          key={upgrade}
                          onClick={() => setSelectedUpgrade(upgrade)}
                          className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
                        >
                          {upgrade}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Not shipped directly in a tracked upgrade.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Direct dependencies</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedNode.directDependencies.length ? (
                      selectedNode.directDependencies.map((dep) => (
                        <button
                          key={dep}
                          onClick={() => setSelectedNodeId(dep)}
                          className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
                        >
                          EIP-{dep}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No direct dependencies recorded.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cross-upgrade reuse</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {relatedUpgrades.length ? (
                      relatedUpgrades.map((upgrade) => (
                        <button
                          key={upgrade}
                          onClick={() => setSelectedUpgrade(upgrade)}
                          className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
                        >
                          {upgrade}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">This node mostly stays inside its own upgrade scope.</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/search?q=EIP-${selectedNode.id}`}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
                  >
                    Open Proposal Search
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/timeline?repo=eips&number=${selectedNode.id}`}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm text-primary transition-colors hover:bg-primary/15"
                  >
                    Open Timeline
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                Click a highlighted hub or press Enter on a search result to inspect why that EIP matters.
              </div>
            )}
          </section>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
