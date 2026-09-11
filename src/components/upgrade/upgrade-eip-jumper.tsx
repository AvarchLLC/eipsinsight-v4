'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ArrowDownRight, Star, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UpgradeCompositionEip } from '@/components/upgrade/types';
import { stageBadgeClass, stageLabel } from '@/lib/upgrade-stages';

interface UpgradeEipJumperProps {
  upgradeName: string;
  composition: UpgradeCompositionEip[];
  onJumpToEip: (eipNumber: number) => void;
  className?: string;
}

export function UpgradeEipJumper({
  upgradeName,
  composition,
  onJumpToEip,
  className,
}: UpgradeEipJumperProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredEips = composition.filter((eip) => {
    if (!normalizedQuery) return true;
    const title = eip.curation?.layman_title || eip.title || '';
    const summary = eip.curation?.layman_summary || '';
    const numberStr = String(eip.eip_number);
    const fullEipStr = `eip-${eip.eip_number}`;
    return (
      numberStr.includes(normalizedQuery) ||
      fullEipStr.includes(normalizedQuery) ||
      title.toLowerCase().includes(normalizedQuery) ||
      summary.toLowerCase().includes(normalizedQuery)
    );
  });

  const handleSelect = (eipNumber: number) => {
    onJumpToEip(eipNumber);
    setIsOpen(false);
    setQuery('');
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick jump chips (headliners first, then included/scheduled)
  const quickJumpEips = composition
    .filter((e) => e.bucket !== 'declined')
    .sort((a, b) => {
      const aIsHeadliner = a.curation?.headliner_of ? 0 : 1;
      const bIsHeadliner = b.curation?.headliner_of ? 0 : 1;
      return aIsHeadliner - bIsHeadliner || a.eip_number - b.eip_number;
    })
    .slice(0, 8);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="rounded-xl border border-border bg-card/80 p-3.5 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Quick EIP Finder for {upgradeName}
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {composition.length} EIP{composition.length !== 1 ? 's' : ''} in scope
          </span>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-2 transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setSelectedIndex(0);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (!isOpen || filteredEips.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedIndex((prev) => (prev + 1) % filteredEips.length);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedIndex((prev) => (prev <= 0 ? filteredEips.length - 1 : prev - 1));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredEips[selectedIndex]) {
                    handleSelect(filteredEips[selectedIndex].eip_number);
                  }
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              placeholder={`Type EIP number or keyword (e.g. 7732, ePBS, access list)...`}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Jump Dropdown */}
          {isOpen && (
            <div className="absolute left-0 right-0 z-40 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-border bg-card/95 shadow-xl backdrop-blur-md divide-y divide-border/50">
              {filteredEips.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No EIPs matching “{query}” found in {upgradeName}
                </div>
              ) : (
                filteredEips.map((eip, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isHeadliner = Boolean(eip.curation?.headliner_of);
                  const title = eip.curation?.layman_title || eip.title || `EIP-${eip.eip_number}`;

                  return (
                    <button
                      key={eip.eip_number}
                      type="button"
                      onClick={() => handleSelect(eip.eip_number)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 p-3 text-left transition-colors',
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-mono text-xs font-bold text-primary">
                            EIP-{eip.eip_number}
                          </span>
                          {eip.bucket && (
                            <span className={cn('rounded-full border px-1.5 py-0.2 text-[10px] font-semibold', stageBadgeClass(eip.bucket))}>
                              {stageLabel(eip.bucket)}
                            </span>
                          )}
                          {isHeadliner && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-500">
                              <Star className="h-2.5 w-2.5 fill-current" />
                              Headliner
                            </span>
                          )}
                          {eip.curation?.layer && (
                            <span className="rounded border px-1 py-0.2 text-[10px] font-mono font-medium text-muted-foreground">
                              {eip.curation.layer}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">{title}</p>
                      </div>
                      <ArrowDownRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Quick jump pills */}
        {quickJumpEips.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
              Jump to EIP:
            </span>
            {quickJumpEips.map((eip) => {
              const isHeadliner = Boolean(eip.curation?.headliner_of);
              return (
                <button
                  key={eip.eip_number}
                  type="button"
                  onClick={() => handleSelect(eip.eip_number)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-mono font-medium transition-colors',
                    isHeadliner
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20'
                      : 'border-border bg-background/60 text-foreground hover:border-primary/40 hover:text-primary'
                  )}
                >
                  {isHeadliner && <Star className="h-2.5 w-2.5 fill-current text-amber-500" />}
                  EIP-{eip.eip_number}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
