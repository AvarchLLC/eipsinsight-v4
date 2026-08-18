'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, Calendar, Users, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExploreTabsHeader() {
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname.startsWith('/explore/years')) return 'years';
    if (pathname.startsWith('/explore/roles')) return 'roles';
    if (pathname.startsWith('/explore/trending')) return 'trending';
    return 'status';
  };

  const activeTab = getActiveTab();

  const tabs = [
    { id: 'status', href: '/explore', label: 'Status & Pipeline', icon: Layers },
    { id: 'years', href: '/explore/years', label: 'By Year & History', icon: Calendar },
    { id: 'roles', href: '/explore/roles', label: 'Roles & Contributors', icon: Users },
    { id: 'trending', href: '/explore/trending', label: 'Trending Proposals', icon: TrendingUp },
  ];

  return (
    <section className="relative z-10 w-full pt-6 pb-2">
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-left">
          <h1 className="dec-title persona-title text-2xl sm:text-3xl font-bold tracking-tight">
            Ethereum Standards Explorer
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Analyze proposals across lifecycle stages, historical timelines, role activity, and proposal momentum.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "relative inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/80 border border-transparent"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
