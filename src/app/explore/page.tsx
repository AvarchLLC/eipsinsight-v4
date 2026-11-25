'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHead } from '@/components/ledger/page-head';
import { InlineBrandLoader } from '@/components/inline-brand-loader';
import { ExploreProposalsTab } from './_components/explore-proposals-tab';
import { ExploreYearsTab } from './_components/explore-years-tab';
import { ExploreRolesTab } from './_components/explore-roles-tab';
import { ExploreTrendingTab } from './_components/explore-trending-tab';

type ExploreTab = 'proposals' | 'years' | 'roles' | 'trending';

const TABS: Array<{ id: ExploreTab; label: string }> = [
  { id: 'proposals', label: 'Proposals' },
  { id: 'years', label: 'By Year' },
  { id: 'roles', label: 'By Role' },
  { id: 'trending', label: 'Trending' },
];

function ExploreWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawTab = (searchParams.get('tab') || 'proposals').toLowerCase();
  const initialTab: ExploreTab =
    rawTab === 'years' || rawTab === 'roles' || rawTab === 'trending' ? rawTab : 'proposals';

  const [activeTab, setActiveTab] = useState<ExploreTab>(initialTab);

  useEffect(() => {
    const paramTab = (searchParams.get('tab') || 'proposals').toLowerCase();
    if (
      paramTab === 'proposals' ||
      paramTab === 'years' ||
      paramTab === 'roles' ||
      paramTab === 'trending'
    ) {
      setActiveTab(paramTab);
    }
  }, [searchParams]);

  const handleTabChange = (nextTab: ExploreTab) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams();
    params.set('tab', nextTab);
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  };

  return (
    <div data-ledger className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <PageHead
        eyebrow="STANDARDS & GOVERNANCE"
        title="Explore Standards"
        lead="Search, sort, and audit every Ethereum proposal, yearly milestone, and governance contributor."
      >
        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              data-active={activeTab === t.id}
              onClick={() => handleTabChange(t.id)}
              className="chip"
            >
              {t.label}
            </button>
          ))}
        </div>
      </PageHead>

      <main className="wrap py-8">
        {activeTab === 'proposals' && <ExploreProposalsTab />}
        {activeTab === 'years' && <ExploreYearsTab />}
        {activeTab === 'roles' && <ExploreRolesTab />}
        {activeTab === 'trending' && <ExploreTrendingTab />}
      </main>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div data-ledger className="flex min-h-screen items-center justify-center bg-[var(--paper)] text-[var(--ink)]">
          <InlineBrandLoader size="md" label="Loading Explore Standards..." />
        </div>
      }
    >
      <ExploreWorkspace />
    </Suspense>
  );
}
