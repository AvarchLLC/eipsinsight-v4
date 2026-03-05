'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Filter, X } from 'lucide-react';
import { motion } from 'motion/react';
import { client } from '@/lib/orpc';
import { RoleTabSwitcher } from './_components/role-tab-switcher';
import { RoleLeaderboard } from './_components/role-leaderboard';
import { RoleActivityTimeline } from './_components/role-activity-timeline';
import { EditorsByCategory } from './_components/editors-by-category';
import { RoleAuthorsTable } from './_components/role-authors-table';

type Role = 'EDITOR' | 'REVIEWER' | 'CONTRIBUTOR' | 'AUTHOR' | null;
type RepoFilter = 'all' | 'eips' | 'ercs' | 'rips';
type CategoryFilter = 'all' | 'governance' | 'core' | 'erc' | 'networking' | 'interface' | 'meta' | 'informational';
type TimeRange = '30d' | '90d' | '365d' | 'all';

interface LeaderboardEntry {
  rank: number;
  actor: string;
  totalScore: number;
  prsReviewed: number;
  comments: number;
  prsCreated: number;
  prsMerged: number;
  prsTouched: number;
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

interface EditorEntry {
  actor: string;
  lastActivity: string | null;
  actions: number;
  reviews: number;
  comments: number;
  prsTouched: number;
}

interface EditorCategoryGroup {
  category: string;
  editors: EditorEntry[];
}

interface AuthorRow {
  rank: number;
  author: string;
  eipsCreated: number;
  lastCreatedAt: string | null;
}

interface AuthorsResponse {
  items: AuthorRow[];
  total: number;
  hasMore: boolean;
}

const REPO_OPTIONS: Array<{ value: RepoFilter; label: string }> = [
  { value: 'all', label: 'All repos' },
  { value: 'eips', label: 'EIPs' },
  { value: 'ercs', label: 'ERCs' },
  { value: 'rips', label: 'RIPs' },
];

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'All categories' },
  { value: 'governance', label: 'Governance' },
  { value: 'core', label: 'Core' },
  { value: 'erc', label: 'ERC' },
  { value: 'networking', label: 'Networking' },
  { value: 'interface', label: 'Interface' },
  { value: 'meta', label: 'Meta' },
  { value: 'informational', label: 'Informational' },
];

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '365d', label: '365 days' },
  { value: 'all', label: 'All time' },
];

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((token) => token[0]?.toUpperCase() + token.slice(1))
    .join(' ');
}

function RolesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialRoleParam = searchParams.get('role')?.toUpperCase();
  const initialRole: Role = initialRoleParam === 'EDITOR' || initialRoleParam === 'REVIEWER' || initialRoleParam === 'CONTRIBUTOR' || initialRoleParam === 'AUTHOR'
    ? initialRoleParam
    : null;

  const initialRepo = (searchParams.get('repo')?.toLowerCase() as RepoFilter) || 'all';
  const initialCategory = (searchParams.get('category')?.toLowerCase() as CategoryFilter) || 'all';
  const initialTimeRange = (searchParams.get('timeRange')?.toLowerCase() as TimeRange) || '90d';
  const initialActor = searchParams.get('actor');

  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [repo, setRepo] = useState<RepoFilter>(REPO_OPTIONS.some((opt) => opt.value === initialRepo) ? initialRepo : 'all');
  const [category, setCategory] = useState<CategoryFilter>(CATEGORY_OPTIONS.some((opt) => opt.value === initialCategory) ? initialCategory : 'all');
  const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGE_OPTIONS.some((opt) => opt.value === initialTimeRange) ? initialTimeRange : '90d');
  const [selectedActor, setSelectedActor] = useState<string | null>(initialActor || null);

  const [roleCounts, setRoleCounts] = useState({ editors: 0, reviewers: 0, contributors: 0, authors: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timeline, setTimeline] = useState<ActivityEvent[]>([]);
  const [editorGroups, setEditorGroups] = useState<EditorCategoryGroup[]>([]);
  const [authors, setAuthors] = useState<AuthorRow[]>([]);
  const [authorsTotal, setAuthorsTotal] = useState(0);
  const [authorsPage, setAuthorsPage] = useState(1);

  const [countsLoading, setCountsLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [editorsLoading, setEditorsLoading] = useState(true);
  const [authorsLoading, setAuthorsLoading] = useState(true);
  const [timelineFallbackUsed, setTimelineFallbackUsed] = useState(false);

  const syncUrl = useCallback(
    (
      nextRole: Role,
      nextRepo: RepoFilter,
      nextCategory: CategoryFilter,
      nextTimeRange: TimeRange,
      nextActor: string | null
    ) => {
      const params = new URLSearchParams();
      if (nextRole) params.set('role', nextRole.toLowerCase());
      if (nextRepo !== 'all') params.set('repo', nextRepo);
      if (nextCategory !== 'all') params.set('category', nextCategory);
      if (nextTimeRange !== '90d') params.set('timeRange', nextTimeRange);
      if (nextActor) params.set('actor', nextActor);
      const query = params.toString();
      router.replace(query ? `/explore/roles?${query}` : '/explore/roles', { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    syncUrl(selectedRole, repo, category, timeRange, selectedActor);
  }, [selectedRole, repo, category, timeRange, selectedActor, syncUrl]);

  useEffect(() => {
    queueMicrotask(() => setCountsLoading(true));
    Promise.all([
      client.explore.getRoleCounts({ repo, category, timeRange }),
      client.explore.getRoleAuthorCount({ repo, category, timeRange }),
    ])
      .then(([data, authorsMeta]) => {
        setRoleCounts({
          editors: data.find((r) => r.role === 'EDITOR')?.uniqueActors || 0,
          reviewers: data.find((r) => r.role === 'REVIEWER')?.uniqueActors || 0,
          contributors: data.find((r) => r.role === 'CONTRIBUTOR')?.uniqueActors || 0,
          authors: authorsMeta.count || 0,
        });
      })
      .catch((error) => console.error('Failed to fetch role counts:', error))
      .finally(() => setCountsLoading(false));
  }, [repo, category, timeRange]);

  useEffect(() => {
    queueMicrotask(() => setAuthorsPage(1));
  }, [repo, category, timeRange]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLeaderboardLoading(true);
        setTimelineLoading(true);
        setEditorsLoading(true);
        setAuthorsLoading(true);
      }
    });

    const roleArg = selectedRole && selectedRole !== 'AUTHOR' ? selectedRole : undefined;
    const actorArg = selectedActor || undefined;

    Promise.allSettled([
      client.explore.getRoleLeaderboard({ role: roleArg, repo, category, timeRange, actor: actorArg, limit: 40 }),
      client.explore.getRoleActivityTimeline({ role: roleArg, repo, category, timeRange, actor: actorArg, limit: 200 }),
      client.explore.getEditorsByCategory({ repo, category, timeRange }),
      client.explore.getRoleAuthors({ repo, category, timeRange, limit: 10, offset: (authorsPage - 1) * 10 }),
    ]).then(async ([lb, tl, ed, au]) => {
      if (cancelled) return;
      if (lb.status === 'fulfilled') setLeaderboard(lb.value as LeaderboardEntry[]);
      if (tl.status === 'fulfilled') {
        const events = tl.value;
        if (events.length === 0 && timeRange !== 'all') {
          const fallbackEvents = await client.explore.getRoleActivityTimeline({
            role: roleArg,
            repo,
            category,
            timeRange: 'all',
            actor: actorArg,
            limit: 200,
          });
          setTimeline(fallbackEvents);
          setTimelineFallbackUsed(fallbackEvents.length > 0);
        } else {
          setTimeline(events);
          setTimelineFallbackUsed(false);
        }
      }
      if (ed.status === 'fulfilled') setEditorGroups(ed.value as EditorCategoryGroup[]);
      if (au.status === 'fulfilled') {
        const data = au.value as AuthorsResponse;
        setAuthors(data.items);
        setAuthorsTotal(data.total);
      }
    }).finally(() => {
      if (!cancelled) {
        setLeaderboardLoading(false);
        setTimelineLoading(false);
        setEditorsLoading(false);
        setAuthorsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedRole, repo, category, timeRange, selectedActor, authorsPage]);

  const activeFilters = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];
    if (selectedRole) {
      chips.push({
        id: 'role',
        label: `Role: ${titleCase(selectedRole)}`,
        onRemove: () => setSelectedRole(null),
      });
    }
    if (repo !== 'all') {
      chips.push({
        id: 'repo',
        label: `Repo: ${repo.toUpperCase()}`,
        onRemove: () => setRepo('all'),
      });
    }
    if (category !== 'all') {
      chips.push({
        id: 'category',
        label: `Category: ${titleCase(category)}`,
        onRemove: () => setCategory('all'),
      });
    }
    if (timeRange !== '90d') {
      chips.push({
        id: 'time',
        label: `Time: ${TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ?? timeRange}`,
        onRemove: () => setTimeRange('90d'),
      });
    }
    if (selectedActor) {
      chips.push({
        id: 'actor',
        label: `Actor: @${selectedActor}`,
        onRemove: () => setSelectedActor(null),
      });
    }
    return chips;
  }, [selectedRole, repo, category, timeRange, selectedActor]);

  const selectedTimeLabel = useMemo(
    () => TIME_RANGE_OPTIONS.find((option) => option.value === timeRange)?.label ?? timeRange,
    [timeRange]
  );

  const isEditorsView = selectedRole === 'EDITOR';
  const isAuthorsView = selectedRole === 'AUTHOR';

  const leaderboardTitle = selectedRole === 'REVIEWER'
    ? 'Top reviewers'
    : selectedRole === 'CONTRIBUTOR'
      ? 'Top contributors'
      : 'Top participants';

  const leaderboardSubtitle = selectedRole === 'REVIEWER'
    ? 'Who is reviewing most in selected scope.'
    : selectedRole === 'CONTRIBUTOR'
      ? 'Who is creating and driving proposal work.'
      : 'Blended activity across editor, reviewer, and contributor actions.';

  return (
    <div className="relative min-h-screen w-full bg-background">
      <section className="w-full pb-2 pt-4">
        <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-6 xl:px-8">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>

          <motion.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-4 mt-3"
          >
            <h1 className="dec-title persona-title text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
              Explore by Roles
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Discover editors, reviewers, and contributors shaping proposal progress across EIPs, ERCs, and RIPs.
            </p>
          </motion.header>

          {!countsLoading && (
            <RoleTabSwitcher
              selectedRole={selectedRole}
              onRoleChange={setSelectedRole}
              counts={roleCounts}
            />
          )}
        </div>
      </section>

      <section className="w-full pb-6">
        <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-6 xl:px-8">
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Repo</span>
                <select
                  value={repo}
                  onChange={(event) => setRepo(event.target.value as RepoFilter)}
                  className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {REPO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as CategoryFilter)}
                  className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Time window</span>
                <select
                  value={timeRange}
                  onChange={(event) => setTimeRange(event.target.value as TimeRange)}
                  className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="flex items-end justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole(null);
                    setRepo('all');
                    setCategory('all');
                    setTimeRange('90d');
                    setSelectedActor(null);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground"
                >
                  <Filter className="h-4 w-4" />
                  Reset filters
                </button>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {activeFilters.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={chip.onRemove}
                    className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary"
                  >
                    {chip.label}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAuthorsView ? (
            <div className="mt-4">
              <RoleAuthorsTable
                rows={authors}
                total={authorsTotal}
                page={authorsPage}
                pageSize={10}
                onPageChange={setAuthorsPage}
                loading={authorsLoading}
              />
            </div>
          ) : (
            <div className="mt-4">
              <div className="min-h-[420px]">
                {isEditorsView ? (
                  <EditorsByCategory
                    groups={editorGroups}
                    loading={editorsLoading}
                    selectedActor={selectedActor}
                    onSelectActor={setSelectedActor}
                  />
                ) : (
                  <RoleLeaderboard
                    entries={leaderboard}
                    loading={leaderboardLoading}
                    title={leaderboardTitle}
                    subtitle={leaderboardSubtitle}
                  />
                )}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timeline</p>
              <h3 className="dec-title text-xl font-semibold tracking-tight text-foreground">
                Recent activity timeline ({selectedTimeLabel})
              </h3>
              {timelineFallbackUsed && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  No events in selected window, showing latest all-time timeline instead.
                </p>
              )}
            </div>
            <div className="max-h-[420px] overflow-hidden">
              <RoleActivityTimeline events={timeline} loading={timelineLoading} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function RolesPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>}>
      <RolesPageContent />
    </Suspense>
  );
}
