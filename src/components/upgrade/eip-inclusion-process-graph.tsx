'use client';

import React, { useState } from 'react';
import { Circle, Minus, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type NodeKey = 'pfi' | 'cfi' | 'sfi' | 'included' | 'dfi';

const nodes: Array<{
  key: NodeKey;
  short: string;
  title: string;
  fullTitle: string;
  detail: string;
  className: string;
  position: { x: number; y: number; w: number; h: number };
}> = [
  {
    key: 'pfi',
    short: 'PFI',
    title: 'Proposed',
    fullTitle: 'Proposed For Inclusion (PFI)',
    detail: 'Entry point for candidate EIPs being pitched for an upcoming upgrade.',
    className:
      'border-amber-500/35 bg-amber-50/90 text-amber-800 dark:bg-amber-500/12 dark:text-amber-200',
    position: { x: 146, y: 70, w: 88, h: 32 },
  },
  {
    key: 'cfi',
    short: 'CFI',
    title: 'Considered',
    fullTitle: 'Considered For Inclusion (CFI)',
    detail: 'Under active review and compared against competing upgrade priorities.',
    className:
      'border-violet-500/35 bg-violet-50/90 text-violet-800 dark:bg-violet-500/12 dark:text-violet-200',
    position: { x: 326, y: 70, w: 88, h: 32 },
  },
  {
    key: 'sfi',
    short: 'SFI',
    title: 'Scheduled',
    fullTitle: 'Scheduled For Inclusion (SFI)',
    detail: 'Accepted into the upgrade scope pending final implementation and testing.',
    className:
      'border-orange-500/35 bg-orange-50/90 text-orange-800 dark:bg-orange-500/12 dark:text-orange-200',
    position: { x: 506, y: 70, w: 88, h: 32 },
  },
  {
    key: 'included',
    short: 'IN',
    title: 'Included',
    fullTitle: 'Included in Upgrade',
    detail: 'Final state once the EIP ships as part of the network upgrade.',
    className:
      'border-emerald-500/35 bg-emerald-50/90 text-emerald-800 dark:bg-emerald-500/12 dark:text-emerald-200',
    position: { x: 686, y: 70, w: 94, h: 32 },
  },
  {
    key: 'dfi',
    short: 'DFI',
    title: 'Declined',
    fullTitle: 'Declined For Inclusion (DFI)',
    detail: 'Exit path if the EIP is deferred, dropped, or rejected during planning.',
    className:
      'border-rose-500/35 bg-rose-50/90 text-rose-800 dark:bg-rose-500/12 dark:text-rose-200',
    position: { x: 416, y: 138, w: 94, h: 32 },
  },
];

const edges = [
  { from: 'start', to: 'pfi', path: 'M82 86 C102 86, 122 86, 146 86' },
  { from: 'pfi', to: 'cfi', path: 'M234 86 C256 81, 298 81, 326 86' },
  { from: 'cfi', to: 'sfi', path: 'M414 86 C436 81, 478 81, 506 86' },
  { from: 'sfi', to: 'included', path: 'M594 86 C620 81, 658 81, 686 86' },
  { from: 'pfi', to: 'dfi', path: 'M170 102 C226 126, 320 140, 416 154' },
  { from: 'cfi', to: 'dfi', path: 'M370 102 C372 118, 382 130, 426 140' },
  { from: 'sfi', to: 'dfi', path: 'M542 102 C530 120, 520 130, 500 140' },
];

function NodeCard({
  short,
  fullTitle,
  detail,
  className,
}: {
  short: string;
  fullTitle: string;
  detail: string;
  className: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'group flex h-full w-full cursor-help items-center justify-center rounded-md border px-1.5 py-1 text-left shadow-sm backdrop-blur-sm',
            'transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
            className
          )}
        >
          <div className="dec-title text-xs font-semibold leading-none tracking-tight transition-transform group-hover:scale-[1.03] sm:text-[13px]">
            {short}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="max-w-52">
        <div className="space-y-1">
          <p className="font-medium text-foreground">{fullTitle}</p>
          <p>{detail}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function EipInclusionProcessGraph() {
  const defaultZoom = 0.82;
  const [zoom, setZoom] = useState(defaultZoom);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-card/40">
      <div className="border-b border-border/70 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="dec-title text-base font-semibold tracking-tight text-foreground sm:text-lg">
              EIP Inclusion Process
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
              PFI progresses to CFI, then SFI, then Included. PFI, CFI, and SFI can all exit to DFI.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(0.72, value - 0.08))}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label="Zoom out"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(defaultZoom)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label="Reset zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(1.08, value + 0.08))}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label="Zoom in"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Circle className="h-2.5 w-2.5 fill-primary/80 text-primary/80" />
          <span>Starts here</span>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-linear-to-br from-background via-background to-primary/3 p-2">
          <div className="origin-center transition-transform duration-200" style={{ transform: `scale(${zoom})` }}>
            <div className="relative h-47 w-225">
              <svg
                aria-hidden="true"
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 900 188"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <marker
                    id="process-arrow"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L7,3.5 L0,7 z" fill="currentColor" className="text-primary/75" />
                  </marker>
                </defs>

                <circle cx="70" cy="86" r="4" className="fill-primary/80" />

                {edges.map((edge) => (
                  <path
                    key={`${edge.from}-${edge.to}`}
                    d={edge.path}
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="3.5 6"
                    strokeLinecap="round"
                    strokeWidth="2"
                    className="text-primary/40"
                    markerEnd="url(#process-arrow)"
                  />
                ))}
              </svg>

              {nodes.map((node) => (
                <div
                  key={node.key}
                  className="absolute"
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                    width: node.position.w,
                    height: node.position.h,
                  }}
                >
                  <NodeCard
                    short={node.short}
                    fullTitle={node.fullTitle}
                    detail={node.detail}
                    className={node.className}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
