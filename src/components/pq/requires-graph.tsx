'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Radio } from 'lucide-react';
import { client } from '@/lib/orpc';
import { ZoomControls } from '@/components/pq/graph-zoom';

type Node = { number: number; title: string; isPq: boolean };
type Edge = { from: number; to: number };
type GNode = Node & { x: number; y: number };

const NODE_W = 146;
const NODE_H = 40;
const COL_GAP = 176;
const ROW_GAP = 46;
const PAD = 16;

function truncate(s: string, n = 24) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function PqRequiresGraph() {
  const [data, setData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const zoomIn = () => setZoom((z) => Math.min(2, Math.round((z + 0.2) * 10) / 10));
  const zoomOut = () => setZoom((z) => Math.max(0.4, Math.round((z - 0.2) * 10) / 10));

  useEffect(() => {
    let cancelled = false;
    client.pq
      .getRequiresGraph()
      .then((d) => {
        if (!cancelled) setData(d as { nodes: Node[]; edges: Edge[] });
      })
      .catch(() => {
        if (!cancelled) setData({ nodes: [], edges: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const layout = useMemo(() => {
    if (!data) return null;
    const { nodes, edges } = data;
    const incoming = new Map<number, number[]>();
    for (const e of edges) incoming.set(e.to, [...(incoming.get(e.to) ?? []), e.from]);

    // Longest-path column assignment (sources at col 0), with a cycle guard.
    const col = new Map<number, number>();
    const visiting = new Set<number>();
    const depth = (n: number): number => {
      const cached = col.get(n);
      if (cached != null) return cached;
      if (visiting.has(n)) return 0;
      visiting.add(n);
      const inc = incoming.get(n) ?? [];
      const d = inc.length ? Math.max(...inc.map((s) => depth(s) + 1)) : 0;
      visiting.delete(n);
      col.set(n, d);
      return d;
    };
    for (const n of nodes) depth(n.number);

    const byCol = new Map<number, number[]>();
    for (const n of [...nodes].sort((a, b) => a.number - b.number)) {
      const c = col.get(n.number) ?? 0;
      byCol.set(c, [...(byCol.get(c) ?? []), n.number]);
    }
    const maxRows = Math.max(...[...byCol.values()].map((a) => a.length), 1);
    const byNum = new Map(nodes.map((n) => [n.number, n]));
    const gnodes: GNode[] = [];
    for (const [c, ns] of byCol) {
      const yOffset = (maxRows - ns.length) / 2;
      ns.forEach((num, row) => {
        const n = byNum.get(num)!;
        gnodes.push({ ...n, x: PAD + c * COL_GAP, y: PAD + (row + yOffset) * ROW_GAP });
      });
    }
    const cols = Math.max(...[...byCol.keys()]) + 1;
    const width = PAD * 2 + (cols - 1) * COL_GAP + NODE_W;
    const height = PAD * 2 + (maxRows - 1) * ROW_GAP + NODE_H;
    return { gnodes, edges, width, height, nodeById: new Map(gnodes.map((n) => [n.number, n])) };
  }, [data]);

  const neighbors = useMemo(() => {
    if (!layout || selected == null) return new Set<number>();
    const s = new Set<number>([selected]);
    for (const e of layout.edges) {
      if (e.from === selected) s.add(e.to);
      if (e.to === selected) s.add(e.from);
    }
    return s;
  }, [layout, selected]);

  if (data === null) {
    return (
      <div className="p-6 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><Radio className="h-3.5 w-3.5 animate-pulse" /> Loading dependency surface…</span>
      </div>
    );
  }
  if (!layout || layout.gnodes.length === 0) {
    return <div className="p-6 text-xs text-muted-foreground">No requires data available yet.</div>;
  }

  const { gnodes, edges, width, height, nodeById } = layout;

  return (
    <div className="relative p-3">
      <ZoomControls zoom={zoom} onIn={zoomIn} onOut={zoomOut} onReset={() => setZoom(0.8)} />
      <div className="max-h-[60vh] overflow-auto rounded-lg">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: width * zoom, height: height * zoom }}
          className="select-none"
          onClick={() => setSelected(null)}
        >
          <defs>
            <marker id="req-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
            </marker>
            <marker id="req-arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border)" />
            </marker>
          </defs>

          {edges.map((e, i) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;
            const x1 = a.x + NODE_W;
            const y1 = a.y + NODE_H / 2;
            const x2 = b.x;
            const y2 = b.y + NODE_H / 2;
            const midX = (x1 + x2) / 2;
            const active = selected == null || e.from === selected || e.to === selected;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={active ? 'var(--primary)' : 'var(--border)'}
                strokeWidth={active ? 2 : 1.25}
                opacity={active ? 0.85 : 0.35}
                markerEnd={`url(#${active ? 'req-arrow' : 'req-arrow-dim'})`}
              />
            );
          })}

          {gnodes.map((n) => {
            const dim = selected != null && !neighbors.has(n.number);
            const isSel = selected === n.number;
            const accent = n.isPq ? 'var(--primary)' : 'var(--muted-foreground)';
            return (
              <g
                key={n.number}
                transform={`translate(${n.x}, ${n.y})`}
                opacity={dim ? 0.35 : 1}
                style={{ cursor: 'pointer' }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setSelected(isSel ? null : n.number);
                }}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={9}
                  fill="var(--card)"
                  stroke={isSel ? 'var(--primary)' : accent}
                  strokeWidth={isSel ? 2.5 : 1.5}
                  strokeDasharray={n.isPq ? undefined : '4 3'}
                />
                <rect width={4} height={NODE_H} rx={2} fill={accent} opacity={n.isPq ? 0.9 : 0.4} />
                <text x={14} y={20} fontSize={12} fontWeight={700} fill="var(--foreground)" fontFamily="monospace">
                  EIP-{n.number}
                </text>
                <text x={14} y={35} fontSize={10} fill="var(--muted-foreground)">
                  {truncate(n.title || (n.isPq ? 'PQ' : 'dependency'))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-primary" /> PQ-related EIP</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-muted-foreground" /> required (non-PQ) EIP</span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="20" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#req-arrow)" /></svg>
          required by / enables →
        </span>
        {selected != null && (() => {
          const n = nodeById.get(selected);
          return n ? (
            <Link href={`/eip/${selected}`} className="ml-auto inline-flex items-center gap-1 font-mono font-semibold text-primary hover:underline">
              EIP-{selected} <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null;
        })()}
      </div>
      <p className="mt-1 px-1 text-[11px] text-muted-foreground">
        Each PQ EIP&apos;s <span className="font-medium text-foreground">requires:</span> header from the live repository.
        Click a node to trace it; click the background to reset.
      </p>
    </div>
  );
}
