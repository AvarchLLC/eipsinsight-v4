'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Eye, Users, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import Link from 'next/link';

interface RoleCount {
  role: string;
  uniqueActors: number;
  totalActions: number;
}

interface TopActor {
  actor: string;
  actions: number;
}

const roleConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: {
    border: string;
    bg: string;
    text: string;
    iconBg: string;
    icon: string;
  };
}> = {
  'EDITOR': {
    icon: Shield,
    label: 'Editors',
    description: 'Maintain standards and review proposals',
    color: {
      border: 'border-cyan-300/60 dark:border-cyan-400/30',
      bg: 'from-cyan-50/90 to-cyan-100/50 dark:from-cyan-500/10 dark:to-cyan-500/5',
      text: 'text-cyan-700 dark:text-cyan-300',
      iconBg: 'bg-cyan-500/20 dark:bg-cyan-500/15',
      icon: 'text-cyan-600 dark:text-cyan-400',
    },
  },
  'REVIEWER': {
    icon: Eye,
    label: 'Reviewers',
    description: 'Provide feedback and technical review',
    color: {
      border: 'border-violet-300/60 dark:border-violet-400/30',
      bg: 'from-violet-50/90 to-violet-100/50 dark:from-violet-500/10 dark:to-violet-500/5',
      text: 'text-violet-700 dark:text-violet-300',
      iconBg: 'bg-violet-500/20 dark:bg-violet-500/15',
      icon: 'text-violet-600 dark:text-violet-400',
    },
  },
  'CONTRIBUTOR': {
    icon: Users,
    label: 'Contributors',
    description: 'Author and contribute to proposals',
    color: {
      border: 'border-emerald-300/60 dark:border-emerald-400/30',
      bg: 'from-emerald-50/90 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5',
      text: 'text-emerald-700 dark:text-emerald-300',
      iconBg: 'bg-emerald-500/20 dark:bg-emerald-500/15',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
  },
};

function RoleCard({ 
  role, 
  count, 
  topActors 
}: { 
  role: string; 
  count: RoleCount | undefined;
  topActors: TopActor[];
}) {
  const config = roleConfig[role];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Link href={`/explore/roles?role=${role.toLowerCase()}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative p-6 rounded-xl border cursor-pointer overflow-hidden",
          "bg-gradient-to-br backdrop-blur-sm",
          "shadow-sm dark:shadow-none ring-1 ring-slate-200/50 dark:ring-transparent",
          "hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-cyan-500/10",
          "transition-all duration-200",
          config.color.border,
          config.color.bg
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            config.color.iconBg
          )}>
            <Icon className={cn("h-6 w-6", config.color.icon)} />
          </div>
          <ArrowRight className="h-5 w-5 text-slate-500" />
        </div>

        {/* Title & Description */}
        <h3 className={cn("dec-title text-lg font-semibold tracking-tight mb-1", config.color.text)}>
          {config.label}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {config.description}
        </p>

        {/* Stats */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="dec-title text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {count?.uniqueActors || 0}
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            total {config.label.toLowerCase()}
          </span>
        </div>

        {/* Top Actors */}
        {topActors.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4">
            <p className="text-xs text-slate-600 dark:text-slate-500 mb-2">Most Active</p>
            <div className="space-y-2">
              {topActors.map((actor, i) => (
                <div
                  key={actor.actor}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                      {i + 1}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                      {actor.actor}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-500">
                    {actor.actions} actions
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </Link>
  );
}

export function RoleCards() {
  const [roleCounts, setRoleCounts] = useState<RoleCount[]>([]);
  const [topActorsByRole, setTopActorsByRole] = useState<Record<string, TopActor[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [counts, editors, reviewers, contributors] = await Promise.all([
          client.explore.getRoleCounts({}),
          client.explore.getTopActorsByRole({ role: 'EDITOR', limit: 3 }),
          client.explore.getTopActorsByRole({ role: 'REVIEWER', limit: 3 }),
          client.explore.getTopActorsByRole({ role: 'CONTRIBUTOR', limit: 3 }),
        ]);

        setRoleCounts(counts);
        setTopActorsByRole({
          'EDITOR': editors,
          'REVIEWER': reviewers,
          'CONTRIBUTOR': contributors,
        });
      } catch (err) {
        console.error('Failed to fetch role data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const roles = ['EDITOR', 'REVIEWER', 'CONTRIBUTOR'];

  return (
    <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-violet-500/15 dark:bg-violet-500/10 border border-violet-400/30 dark:border-violet-400/20">
            <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="dec-title text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Browse by Role</h2>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <RoleCard
                role={role}
                count={roleCounts.find(c => c.role === role)}
                topActors={topActorsByRole[role] || []}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
