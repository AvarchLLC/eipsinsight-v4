'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Users, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import Link from 'next/link';
import { RoleTabSwitcher } from './_components/role-tab-switcher';
import { RoleLeaderboard } from './_components/role-leaderboard';
import { RoleActivityTimeline } from './_components/role-activity-timeline';
import { RoleActivitySparkline } from './_components/role-activity-sparkline';
import { SectionSeparator } from '@/components/header';

type Role = 'EDITOR' | 'REVIEWER' | 'CONTRIBUTOR' | null;

interface LeaderboardEntry {
  rank: number;
  actor: string;
  totalScore: number;
  prsReviewed: number;
  comments: number;
  prsCreated: number;
  prsMerged: number;
  avgResponseHours: number | null;
  lastActivity: string | null;
  role: string | null;
}

interface ActivityEvent {
  id: string;
  actor: string;
  role: string | null;
  eventType: string;
  prNumber: number;
  createdAt: string;
  githubId: string | null;
  repoName: string;
}

interface SparklineData {
  month: string;
  count: number;
}

function RolesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialRole = searchParams.get('role')?.toUpperCase() as Role || null;

  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [roleCounts, setRoleCounts] = useState({
    editors: 0,
    reviewers: 0,
    contributors: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeline, setTimeline] = useState<ActivityEvent[]>([]);
  const [sparkline, setSparkline] = useState<SparklineData[]>([]);
  const [countsLoading, setCountsLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [sparklineLoading, setSparklineLoading] = useState(true);

  // Fetch role counts (independent, runs once)
  useEffect(() => {
    client.explore.getRoleCounts({}).then(data => {
      setRoleCounts({
        editors: data.find(r => r.role === 'EDITOR')?.uniqueActors || 0,
        reviewers: data.find(r => r.role === 'REVIEWER')?.uniqueActors || 0,
        contributors: data.find(r => r.role === 'CONTRIBUTOR')?.uniqueActors || 0,
      });
    }).catch(err => console.error('Failed to fetch role counts:', err))
      .finally(() => setCountsLoading(false));
  }, []);

  // Fetch leaderboard, timeline, sparkline in parallel when role changes
  useEffect(() => {
    setLeaderboardLoading(true);
    setTimelineLoading(true);
    setSparklineLoading(true);

    const roleArg = selectedRole || undefined;

    Promise.allSettled([
      client.explore.getRoleLeaderboard({ role: roleArg, limit: 20 }),
      client.explore.getRoleActivityTimeline({ role: roleArg, limit: 20 }),
      client.explore.getRoleActivitySparkline({ role: roleArg }),
    ]).then(([lb, tl, sp]) => {
      if (lb.status === 'fulfilled') setLeaderboard(lb.value as LeaderboardEntry[]);
      if (tl.status === 'fulfilled') setTimeline(tl.value);
      if (sp.status === 'fulfilled') setSparkline(sp.value);
    }).finally(() => {
      setLeaderboardLoading(false);
      setTimelineLoading(false);
      setSparklineLoading(false);
    });
  }, [selectedRole]);

  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    
    if (role) {
      router.push(`/explore/roles?role=${role.toLowerCase()}`, { scroll: false });
    } else {
      router.push('/explore/roles', { scroll: false });
    }
  };

  return (
    <div className="bg-background relative w-full overflow-hidden min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.08),_transparent_50%)]" />
      </div>

      {/* Header */}
      <section className="relative w-full pt-8 pb-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/explore"
            className={cn(
              "inline-flex items-center gap-2 mb-6",
              "text-sm text-slate-400 hover:text-white transition-colors"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>

          {/* Page Title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-400/30">
              <Users className="h-7 w-7 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Browse by Role
              </h1>
              <p className="text-slate-400">
                Explore contributors by their role in the EIP process
              </p>
            </div>
          </div>

          {/* Role Tab Switcher */}
          {!countsLoading && (
            <RoleTabSwitcher
              selectedRole={selectedRole}
              onRoleChange={handleRoleChange}
              counts={roleCounts}
            />
          )}
        </div>
      </section>

      <SectionSeparator />

      {/* Main Content */}
      <section className="relative w-full py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Leaderboard (2/3 width) */}
            <div className="lg:col-span-2">
              <RoleLeaderboard entries={leaderboard} loading={leaderboardLoading} />
            </div>

            {/* Sidebar (1/3 width) */}
            <div className="space-y-6">
              {/* Activity Sparkline */}
              <RoleActivitySparkline
                data={sparkline}
                loading={sparklineLoading}
                role={selectedRole}
              />

              {/* Activity Timeline */}
              <RoleActivityTimeline events={timeline} loading={timelineLoading} />
            </div>
          </div>
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-16" />
    </div>
  );
}

export default function RolesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    }>
      <RolesPageContent />
    </Suspense>
  );
}
