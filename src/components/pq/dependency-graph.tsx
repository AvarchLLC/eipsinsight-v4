'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Link2Off } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PQ_EIPS, type PqEip } from '@/data/pq-registry';

// Roadmap milestone → column, so edges mostly flow left (early) → right (late).
const MILESTONE_ORDER = ['Pre-L*', 'I*', 'I*/L*', 'J*', 'L*', 'M*', 'Long-term'];
const colOfMilestone = (m: string) => {
  const i = MILESTONE_ORDER.indexOf(m);
  return i === -1 ? MILESTONE_ORDER.length : i;
};

type GNode = { number: number; eip?: PqEip; col: number; row: number; x: number; y: number; external: boolean };
type GEdge = { from: number; to: number; type: 'enables' };

const NODE_W = 128;
const NODE_H = 46;
const COL_GAP = 186;
const ROW_GAP = 70;
const PAD_X = 24;
const PAD_Y = 24;

const roleColor: Record<string, string> = {
  'Direct PQ': 'var(--chart-1, #ef4444)',
  Enabler: 'var(--chart-2, #0ea5e9)',
  Prerequisite: 'var(--chart-3, #f59e0b)',
  Related: 'var(--muted-foreground)',
};

export function PqDependencyGraph() {
  const [selected, setSelected] = useState<number | null>(null);

  const { nodes, edges, altEdges, width, height, nodeById } = useMemo(() => {
    // Canonical directed edges in the "enables / unlocks" direction, deduped.
    const edgeSet = new Set<string>();
    const edges: GEdge[] = [];
    const addEdge = (from: number, to: number) => {
      const k = `${from}->${to}`;
      if (!edgeSet.has(k)) {
        edgeSet.add(k);
        edges.push({ from, to, type: 'enables' });
      }
    };
    for (const e of PQ_EIPS) {
      for (const d of e.dependsOn ?? []) addEdge(d, e.number); // d enables e
      for (const en of e.enables ?? []) addEdge(e.number, en);
    }

    // Undirected "alternative to" (competing designs), deduped.
    const altSet = new Set<string>();
    const altEdges: Array<{ a: number; b: number }> = [];
    for (const e of PQ_EIPS) {
      for (const alt of e.alternativeTo ?? []) {
        const k = [e.number, alt].sort((x, y) => x - y).join('~');
        if (!altSet.has(k)) {
          altSet.add(k);
          altEdges.push({ a: e.number, b: alt });
        }
      }
    }

    // Collect all node numbers (registry + referenced externals).
    const numbers = new Set<number>(PQ_EIPS.map((e) => e.number));
    for (const e of edges) {
      numbers.add(e.from);
      numbers.add(e.to);
    }

    // Column per node: registry by milestone; externals one left of their earliest consumer.
    const colOf = new Map<number, number>();
    for (const n of numbers) {
      const eip = PQ_EIPS.find((e) => e.number === n);
      if (eip) colOf.set(n, colOfMilestone(eip.milestone));
    }
    for (const n of numbers) {
      if (colOf.has(n)) continue;
      const consumers = edges.filter((e) => e.from === n).map((e) => colOf.get(e.to) ?? 1);
      colOf.set(n, Math.max(0, (consumers.length ? Math.min(...consumers) : 1) - 1));
    }

    // Stack nodes within each column.
    const byCol = new Map<number, number[]>();
    for (const n of [...numbers].sort((a, b) => a - b)) {
      const c = colOf.get(n)!;
      byCol.set(c, [...(byCol.get(c) ?? []), n]);
    }
    const maxRows = Math.max(...[...byCol.values()].map((a) => a.length), 1);
    const nodes: GNode[] = [];
    for (const [c, ns] of byCol) {
      ns.forEach((n, row) => {
        const eip = PQ_EIPS.find((e) => e.number === n);
        // vertically center each column's stack
        const colRows = ns.length;
        const yOffset = (maxRows - colRows) / 2;
        nodes.push({
          number: n,
          eip,
          col: c,
          row,
          external: !eip,
          x: PAD_X + c * COL_GAP,
          y: PAD_Y + (row + yOffset) * ROW_GAP,
        });
      });
    }
    const cols = Math.max(...[...byCol.keys()]) + 1;
    const width = PAD_X * 2 + (cols - 1) * COL_GAP + NODE_W;
    const height = PAD_Y * 2 + (maxRows - 1) * ROW_GAP + NODE_H;
    const nodeById = new Map(nodes.map((n) => [n.number, n]));
    return { nodes, edges, altEdges, width, height, nodeById };
  }, []);

  const neighbors = useMemo(() => {
    if (selected == null) return new Set<number>();
    const s = new Set<number>([selected]);
    for (const e of edges) {
      if (e.from === selected) s.add(e.to);
      if (e.to === selected) s.add(e.from);
    }
    return s;
  }, [selected, edges]);

  const selEip = selected != null ? PQ_EIPS.find((e) => e.number === selected) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3">
      {/* Graph */}
      <div className="p-3 lg:col-span-2">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            style={{ minWidth: width, maxWidth: '100%' }}
            className="select-none"
            onClick={() => setSelected(null)}
          >
            <defs>
              <marker id="pq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
              </marker>
              <marker id="pq-arrow-dim" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border)" />
              </marker>
            </defs>

            {/* Edges */}
            {edges.map((e, i) => {
              const a = nodeById.get(e.from)!;
              const b = nodeById.get(e.to)!;
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
                  opacity={active ? 0.9 : 0.4}
                  markerEnd={`url(#${active ? 'pq-arrow' : 'pq-arrow-dim'})`}
                />
              );
            })}

            {/* Alternative-to (competing designs): dashed, no arrow, curved to avoid nodes */}
            {altEdges.map((e, i) => {
              const a = nodeById.get(e.a);
              const b = nodeById.get(e.b);
              if (!a || !b) return null;
              const x1 = a.x + NODE_W / 2;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x + NODE_W / 2;
              const y2 = b.y + NODE_H / 2;
              const cx = Math.min(x1, x2) - 34;
              const active = selected == null || e.a === selected || e.b === selected;
              return (
                <path
                  key={`alt-${i}`}
                  d={`M ${x1} ${y1} Q ${cx} ${(y1 + y2) / 2} ${x2} ${y2}`}
                  fill="none"
                  stroke={active ? 'var(--muted-foreground)' : 'var(--border)'}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  opacity={active ? 0.6 : 0.3}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((n) => {
              const dim = selected != null && !neighbors.has(n.number);
              const isSel = selected === n.number;
              const color = n.eip ? roleColor[n.eip.role] : 'var(--muted-foreground)';
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
                    stroke={isSel ? 'var(--primary)' : n.external ? 'var(--border)' : color}
                    strokeWidth={isSel ? 2.5 : 1.5}
                    strokeDasharray={n.external ? '4 3' : undefined}
                  />
                  <rect width={4} height={NODE_H} rx={2} fill={color} opacity={n.external ? 0.4 : 0.9} />
                  <text x={14} y={19} fontSize={12} fontWeight={700} fill="var(--foreground)" fontFamily="monospace">
                    EIP-{n.number}
                  </text>
                  <text x={14} y={34} fontSize={10} fill="var(--muted-foreground)">
                    {n.eip ? `${n.eip.capability} · ${n.eip.milestone}` : 'not in registry'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 px-1 text-[11px] text-muted-foreground">
          <Legend color={roleColor['Direct PQ']} label="Direct PQ" />
          <Legend color={roleColor.Enabler} label="Enabler" />
          <Legend color={roleColor.Prerequisite} label="Prerequisite" />
          <span className="inline-flex items-center gap-1.5">
            <svg width="20" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--primary)" strokeWidth="2" markerEnd="url(#pq-arrow)" /></svg>
            enables / unlocks →
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="20" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
            alternative to
          </span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-muted-foreground" /> external dep</span>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">Click a node to trace its dependencies; click the background to reset.</p>
      </div>

      {/* Detail panel */}
      <div className="border-t border-border p-4 lg:col-span-1 lg:border-l lg:border-t-0">
        <div className="sticky top-20">
          {selEip ? (
            <>
              <Link href={`/eip/${selEip.number}`} className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-primary hover:underline">
                EIP-{selEip.number} <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <p className="mt-1 text-sm font-semibold text-foreground">{selEip.title}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-muted-foreground">{selEip.layer}</span>
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-muted-foreground">{selEip.capability}</span>
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-muted-foreground">{selEip.milestone}</span>
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-muted-foreground">{selEip.status}</span>
              </div>
              {selEip.note && <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{selEip.note}</p>}
              <RelList label="Requires" nums={selEip.dependsOn ?? []} onPick={setSelected} />
              <RelList label="Enables" nums={selEip.enables ?? []} onPick={setSelected} />
              <RelList label="Required by" nums={PQ_EIPS.filter((e) => (e.dependsOn ?? []).includes(selEip.number)).map((e) => e.number)} onPick={setSelected} />
              <RelList label="Alternative to" nums={selEip.alternativeTo ?? []} onPick={setSelected} />
              {selEip.replaces && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Replaces</p>
                  <p className="mt-1 text-xs text-foreground">{selEip.replaces}</p>
                </div>
              )}
              {selEip.researchDep && selEip.researchDep.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Research deps</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {selEip.researchDep.map((r) => (
                      <span key={r} className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Select a node</p>
              <p className="mt-1.5 text-xs leading-relaxed">
                Click any EIP to see what it requires, enables, is required by, and competes with. Click the background
                to reset.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RelList({ label, nums, onPick }: { label: string; nums: number[]; onPick: (n: number) => void }) {
  if (!nums.length) return null;
  return (
    <div className="mt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {nums.map((n) => {
          const known = PQ_EIPS.find((e) => e.number === n);
          return (
            <button
              key={n}
              onClick={() => known && onPick(n)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors',
                known ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15' : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
              )}
            >
              EIP-{n}
              {!known && <Link2Off className="h-3 w-3" aria-label="not in registry" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
