'use client';

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type UpgradeKey = 'pectra' | 'fusaka' | 'glamsterdam' | 'hegota';
type TimelineKey = 'overview' | 'archive' | UpgradeKey;

interface TimelineUpgrade {
  name: string;
  key: TimelineKey;
  href: string;
  date: string;
  color: string;
  isPast: boolean;
}

interface HorizontalUpgradeTimelineProps {
  selectedUpgrade?: UpgradeKey;
  onUpgradeClick?: (upgrade: UpgradeKey) => void;
  className?: string;
}

const MotionDiv = motion.div;

const upgrades: TimelineUpgrade[] = [
  {
    name: 'Overview',
    key: 'overview',
    href: '/upgrade',
    date: 'All Upgrades',
    color: '#6B7280',
    isPast: true,
  },
  {
    name: 'Previous Upgrades',
    key: 'archive',
    href: '/upgrade/archive',
    date: '2015 – 2024',
    color: '#6B7280',
    isPast: true,
  },
  {
    name: 'Pectra',
    key: 'pectra',
    href: '/upgrade/pectra',
    date: 'May 7, 2025',
    color: '#DC2626',
    isPast: true,
  },
  {
    name: 'Fusaka',
    key: 'fusaka',
    href: '/upgrade/fusaka',
    date: 'Dec 3, 2025',
    color: '#10B981',
    isPast: true,
  },
  {
    name: 'Glamsterdam',
    key: 'glamsterdam',
    href: '/upgrade/glamsterdam',
    date: '2026',
    color: '#8B5CF6',
    isPast: false,
  },
  {
    name: 'Hegotá',
    key: 'hegota',
    href: '/upgrade/hegota',
    date: 'TBD',
    color: '#F59E0B',
    isPast: false,
  },
];

export function HorizontalUpgradeTimeline({
  selectedUpgrade = 'glamsterdam',
  onUpgradeClick,
  className,
}: HorizontalUpgradeTimelineProps) {
  const currentIndex = upgrades.findIndex((u) => u.key === 'fusaka');
  const transitionIndex = currentIndex;

  return (
    <div
      className={cn(
        'relative overflow-x-auto rounded-xl border border-border bg-card/60 p-4 shadow-sm backdrop-blur-sm sm:p-5 md:p-6',
        className,
      )}
    >
      <div className="flex min-w-max items-center justify-between gap-3 px-1 sm:gap-4 sm:px-2 md:gap-6">
        {upgrades.map((upgrade, index) => {
          const isSelected = selectedUpgrade === upgrade.key;
          const isBeforeCurrent = index < currentIndex;
          const isTransitionLine = index === transitionIndex;
          const isProgressMilestone = upgrade.key !== 'overview' && upgrade.key !== 'archive';

          return (
            <React.Fragment key={`${upgrade.key}-${index}`}>
              <Link
                href={upgrade.href}
                className={cn(
                  'relative z-10 flex flex-col items-center',
                  'cursor-pointer',
                )}
              >
                <MotionDiv
                  whileHover={{ scale: 1.06, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  onClick={(e) => {
                    if (onUpgradeClick && isProgressMilestone) {
                      e.preventDefault();
                      onUpgradeClick(upgrade.key as UpgradeKey);
                    }
                  }}
                  className="w-full"
                >
                <div
                  className={cn(
                    'relative rounded-lg px-3 py-2.5 text-center text-xs font-semibold tracking-tight transition-all sm:px-4 sm:py-3 sm:text-sm md:px-5 md:py-3.5 md:text-base',
                    upgrade.key === 'overview' || upgrade.key === 'archive'
                      ? 'border border-border bg-muted/50 text-muted-foreground'
                      : 'border border-border bg-background/60 text-foreground',
                    !isSelected &&
                      isProgressMilestone &&
                      'hover:border-primary/40 hover:bg-primary/10 hover:text-primary',
                  )}
                  style={
                    isSelected
                      ? {
                          background: `linear-gradient(135deg, ${upgrade.color}, rgba(17, 24, 39, 0.95))`,
                          boxShadow: `0 10px 24px ${upgrade.color}40`,
                          borderColor: upgrade.color,
                          color: '#f8fafc',
                        }
                      : undefined
                  }
                >
                  <div className="whitespace-nowrap">{upgrade.name}</div>
                  {isBeforeCurrent && isProgressMilestone && (
                    <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-primary shadow-sm sm:h-3.5 sm:w-3.5" />
                  )}
                </div>

                  <div className="mt-1.5 flex flex-col items-center gap-1 sm:mt-2">
                    <div className="text-[10px] font-semibold tracking-wide text-muted-foreground sm:text-xs md:text-sm">
                      {upgrade.date}
                    </div>
                  </div>
                </MotionDiv>
              </Link>

              {index < upgrades.length - 1 && (
                <div
                  className="relative mx-2 h-1.5 flex-1 rounded-full bg-border/80 shadow-inner sm:mx-3 sm:h-1.5 md:mx-6 md:h-2"
                  style={{ minWidth: '32px', maxWidth: '220px' }}
                >
                  {/* Completed segments (fully green) */}
                  {isBeforeCurrent && (
                    <MotionDiv
                      className="absolute inset-y-0 left-0 rounded-full bg-primary shadow-[0_0_18px_rgba(16,185,129,0.45)]"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  )}

                  {/* Transition segment (partial progress between Fusaka and Glamsterdam) */}
                  {isTransitionLine && (
                    <>
                      <MotionDiv
                        className="absolute inset-y-0 left-0 rounded-full bg-primary shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                        initial={{ width: '0%' }}
                        animate={{ width: '60%' }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                      {/* Compact "We are here" indicator positioned on the transition line */}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-start" style={{ paddingLeft: '60%' }}>
                        <MotionDiv
                          className="relative -translate-x-1/2"
                          animate={{ 
                            scale: [1, 1.03, 1],
                            y: [0, -1.5, 0]
                          }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <div className="relative whitespace-nowrap rounded-md border border-primary/30 bg-primary/90 backdrop-blur-sm px-1.5 py-0.5 text-[7px] font-medium text-primary-foreground shadow-sm shadow-primary/35 sm:px-2 sm:py-0.5 sm:text-[8px] md:px-2 md:py-1 md:text-[9px]">
                            <span className="mr-0.5 text-[6px] sm:text-[7px] md:text-[8px]">📍</span>
                            <span className="hidden sm:inline">We are here</span>
                            <span className="sm:hidden">Here</span>
                          </div>
                          {/* Tiny arrow pointing down */}
                          <div 
                            className="absolute left-1/2 top-full -translate-x-1/2 mt-0.5"
                            style={{
                              width: 0,
                              height: 0,
                              borderLeft: '2.5px solid transparent',
                              borderRight: '2.5px solid transparent',
                              borderTop: '3.5px solid hsl(var(--primary))',
                              filter: 'drop-shadow(0 1px 2px rgba(16, 185, 129, 0.2))',
                            }}
                          />
                        </MotionDiv>
                      </div>
                    </>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="pointer-events-none absolute -right-1 top-1/2 hidden -translate-y-1/2 md:block">
        <MotionDiv
          animate={{ x: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="h-0 w-0"
            style={{
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderLeft: '16px solid hsl(var(--muted-foreground) / 0.55)',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))',
            }}
          />
        </MotionDiv>
      </div>
    </div>
  );
}
