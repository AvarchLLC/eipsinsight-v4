'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Users, UserCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonaStore } from '@/stores/personaStore';
import { getPersonaPageConfig, getPersonaMeta } from '@/lib/persona';
import { FEATURES } from '@/lib/features';

const navItems = [
  { title: 'PR Analytics', href: '/analytics/prs', icon: BarChart3, key: 'prs' as const },
  { title: 'Contributors', href: '/analytics/contributors', icon: Users, key: 'contributors' as const },
  { title: 'Editors & Reviewers', href: '/analytics/editors', icon: UserCheck, key: 'editors' as const },
];

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { persona, isHydrated } = usePersonaStore();

  // Get persona config for highlighting recommended tab
  const pageConfig = getPersonaPageConfig(persona);
  const personaMeta = getPersonaMeta(persona);
  const recommendedTab = pageConfig.analyticsDefault;
  const showPersonaFeatures = FEATURES.PERSONA_SWITCHER || FEATURES.PERSONA_NAV_REORDER;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-20 border-b border-cyan-400/20 bg-slate-950/90 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/') ||
                  pathname.startsWith(item.href + '?');
                const Icon = item.icon;
                const isRecommended = showPersonaFeatures && isHydrated && item.key === recommendedTab;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all relative',
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
                      isRecommended && !isActive && 'ring-1 ring-emerald-400/30'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                    {isRecommended && !isActive && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Persona indicator */}
            {showPersonaFeatures && isHydrated && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                <span className="text-xs text-slate-400">
                  <span className="text-cyan-300">{personaMeta.shortLabel}</span> view
                </span>
              </div>
            )}
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
