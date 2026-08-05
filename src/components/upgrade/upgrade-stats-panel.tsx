'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { CopyLinkButton } from '@/components/header';
import { UpgradeStatsCards } from '@/components/upgrade/upgrade-stats-cards';

import { client } from '@/lib/orpc';
import { Loader2, BarChart2, Users } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { eipTitles, rawData, upgradeMetaEIPs, pairedUpgradeNames } from '@/data/network-upgrades';
import { TOTAL_NETWORK_UPGRADES } from '@/data/upgrade-timeline-stats';

/**
 * The stats-and-tables half of the old /upgrade/analytics page, extracted so it
 * can live at the bottom of /upgrade. The two timeline charts it used to hold
 * now live in <UpgradeChartsTabs> higher on the page, so they're omitted here.
 */
export function UpgradeStatsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTable, setActiveTable] = useState<'core' | 'meta' | 'execution' | 'consensus' | 'authors' | null>(null);
  const [page, setPage] = useState(1);
  const [columnSearch, setColumnSearch] = useState({
    author: '',
    eip: '',
    title: '',
    upgrade: '',
    layer: '',
    date: '',
  });
  const [independentIncludedAuthors, setIndependentIncludedAuthors] = useState<number>(0);
  const [independentAuthorRows, setIndependentAuthorRows] = useState<Array<{
    id: string;
    author: string;
    displayName: string;
    githubHandle: string | null;
    totalEips: number;
    eipNumbers: number[];
    sampleEip: number | null;
    sampleTitle: string;
    upgrades: string[];
  }>>([]);
  const [authorFilters, setAuthorFilters] = useState({
    author: '',
    eip: '',
    upgrade: '',
  });
  const [authorPage, setAuthorPage] = useState(1);
  const detailsSectionRef = useRef<HTMLDivElement>(null);
  const authorsSectionRef = useRef<HTMLDivElement>(null);
  // Distinct activation dates (22) — same-date EL/CL pairs and the
  // Constantinople/Petersburg hotfix count once. The old getDisplayUpgradeName
  // recount left Constantinople/Petersburg as two, giving 23.
  const totalUpgradeCount = TOTAL_NETWORK_UPGRADES;
  const coreEipRows = useMemo(() => {
    return rawData
      .flatMap((item) =>
        item.eips
          // Exclude placeholders and '-removed' entries so the row count equals
          // the "EIPs deployed" stat (a removed EIP was not actually deployed).
          .filter(
            (eip) => eip !== 'NO-EIP' && eip !== 'CONSENSUS' && !eip.endsWith('-removed')
          )
          .map((eip) => {
            const eipNumber = eip.replace('EIP-', '').replace('-removed', '');
            const eipInfo = eipTitles[eipNumber];

            return {
              id: `${item.upgrade}-${eip}`,
              eipNumber,
              title: eipInfo?.title ?? `EIP-${eipNumber}`,
              upgrade: getDisplayUpgradeName(item.upgrade, item.date),
              upgradeHref: getUpgradeHref(item.upgrade, item.date),
              layer: item.layer === 'consensus' ? 'Consensus' : 'Execution',
              date: item.date,
            };
          })
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  const metaEipRows = useMemo(() => {
    return rawData
      .filter((item) => upgradeMetaEIPs[item.upgrade])
      .map((item) => {
        const metaEip = upgradeMetaEIPs[item.upgrade];
        const eipNumber = metaEip.replace('EIP-', '');
        const eipInfo = eipTitles[eipNumber];

        return {
          id: `${item.upgrade}-${metaEip}`,
          eipNumber,
          title: eipInfo?.title ?? `Meta EIP for ${item.upgrade}`,
          upgrade: getDisplayUpgradeName(item.upgrade, item.date),
          upgradeHref: getUpgradeHref(item.upgrade, item.date),
          layer: item.layer === 'consensus' ? 'Consensus' : 'Execution',
          date: item.date,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, []);

  const activeRows = useMemo(() => {
    if (activeTable === 'authors') return [];
    if (activeTable === 'meta') return metaEipRows;
    if (activeTable === 'execution') return coreEipRows.filter((row) => row.layer === 'Execution');
    if (activeTable === 'consensus') return coreEipRows.filter((row) => row.layer === 'Consensus');
    return coreEipRows;
  }, [activeTable, coreEipRows, metaEipRows]);
  const filteredRows = useMemo(() => {
    if (activeTable === 'authors') return [];
    return activeRows.filter((row) =>
      Object.entries(columnSearch).every(([key, search]) => {
        if (key === 'author') return true;
        const normalizedSearch = search.trim().toLowerCase();
        if (!normalizedSearch) return true;

        if (key === 'eip') {
          return `eip-${row.eipNumber}`.toLowerCase().includes(normalizedSearch) || row.eipNumber.toLowerCase().includes(normalizedSearch);
        }

        return String(row[key as keyof typeof row] ?? '')
          .toLowerCase()
          .includes(normalizedSearch);
      })
    );
  }, [activeRows, columnSearch, activeTable]);
  const filteredAuthorRows = useMemo(() => {
    return independentAuthorRows.filter((row) => {
      const authorSearch = authorFilters.author.trim().toLowerCase();
      const eipSearch = authorFilters.eip.trim().toLowerCase();
      const upgradeSearch = authorFilters.upgrade.trim().toLowerCase();

      const matchesAuthor =
        !authorSearch ||
        row.displayName.toLowerCase().includes(authorSearch) ||
        row.author.toLowerCase().includes(authorSearch) ||
        row.githubHandle?.toLowerCase().includes(authorSearch);
      const matchesEip =
        !eipSearch ||
        row.eipNumbers.some((eipNumber) => `eip-${eipNumber}`.toLowerCase().includes(eipSearch) || String(eipNumber).includes(eipSearch));
      const matchesUpgrade = !upgradeSearch || row.upgrades.join(', ').toLowerCase().includes(upgradeSearch);

      return matchesAuthor && matchesEip && matchesUpgrade;
    });
  }, [independentAuthorRows, authorFilters]);
  const pageSize = 10;
  const resultCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(resultCount / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    if (activeTable === 'authors') return [];
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, activeTable]);
  const paginatedAuthorRows = useMemo(() => {
    const start = (authorPage - 1) * pageSize;
    return filteredAuthorRows.slice(start, start + pageSize);
  }, [filteredAuthorRows, authorPage]);
  const isTableFiltered = Object.entries(columnSearch).some(([key, value]) => key !== 'author' && value.trim().length > 0);
  const authorTotalPages = Math.max(1, Math.ceil(filteredAuthorRows.length / pageSize));

  const handleSelectTable = (mode: 'core' | 'meta' | 'execution' | 'consensus' | 'authors') => {
    setActiveTable(mode);
    if (mode === 'authors') {
      requestAnimationFrame(() => {
        authorsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    setPage(1);
    requestAnimationFrame(() => {
      detailsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleColumnSearch = (key: keyof typeof columnSearch, value: string) => {
    setColumnSearch((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setColumnSearch({
      author: '',
      eip: '',
      title: '',
      upgrade: '',
      layer: '',
      date: '',
    });
    setPage(1);
  };

  const clearAuthorFilters = () => {
    setAuthorFilters({
      author: '',
      eip: '',
      upgrade: '',
    });
    setAuthorPage(1);
  };

  const downloadReport = () => {
    if (!activeTable || activeTable === 'authors') return;

    const csvEscape = (value: string | number | null | undefined) => {
      const text = String(value ?? '');
      if (text.includes('"') || text.includes(',') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const header = ['EIP', 'Title', 'Upgrade', 'Layer', 'Date'];

    const rows = filteredRows.map((row) =>
      [`EIP-${row.eipNumber}`, row.title, row.upgrade, row.layer, row.date]
        .map(csvEscape)
        .join(',')
    );

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upgrade-eips-report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAuthorReport = () => {
    const csvEscape = (value: string | number | null | undefined) => {
      const text = String(value ?? '');
      if (text.includes('"') || text.includes(',') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const header = ['Author Name', 'GitHub Handle', 'Included EIPs', 'EIP List', 'Upgrades', 'Profile Link'];
    const rows = filteredAuthorRows.map((row) =>
      [
        row.displayName,
        row.githubHandle ?? '',
        row.totalEips,
        row.eipNumbers.map((eipNumber) => `EIP-${eipNumber}`).join(' | '),
        row.upgrades.join(' | '),
        `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}${row.githubHandle ? `/people/${encodeURIComponent(row.githubHandle)}` : `/search?q=${encodeURIComponent(row.author)}`}`,
      ]
        .map(csvEscape)
        .join(',')
    );

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'included-eip-authors-report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (authorPage > authorTotalPages) {
      setAuthorPage(authorTotalPages);
    }
  }, [authorPage, authorTotalPages]);

  useEffect(() => {
    if (!activeTable) {
      clearFilters();
    }
  }, [activeTable]);

  useEffect(() => {
    // Loads author leaderboard data for the tables below the stat cards.
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [upgradeStats, independentAuthors] = await Promise.all([
          client.upgrades.getUpgradeStats({}).catch(() => null),
          client.upgrades.getIndependentIncludedAuthors({}).catch(() => []),
        ]);

        setIndependentIncludedAuthors(upgradeStats?.independentIncludedAuthors ?? 0);
        setIndependentAuthorRows(
          independentAuthors.map((row) => ({
            id: `${row.authorKey}-${row.sampleEip ?? 'none'}`,
            author: row.authorKey,
            displayName: row.displayName ?? row.authorKey,
            githubHandle: row.githubHandle ?? null,
            totalEips: row.totalEips,
            eipNumbers: row.eipNumbers,
            sampleEip: row.sampleEip,
            sampleTitle: row.sampleTitle,
            upgrades: row.upgrades,
          }))
        );
      } catch (err) {
        console.error('Failed to fetch upgrade data:', err);
        setError('Failed to load upgrade data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full px-3 py-16 sm:px-4 lg:px-5 xl:px-6">
          <div className="flex items-center justify-center min-h-100">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Stat cards — click a card to reveal its dataset in the tables below. */}
      <section id="stats">
        <UpgradeStatsCards
          totalUpgrades={totalUpgradeCount}
          independentIncludedAuthors={independentIncludedAuthors}
          activeTable={activeTable}
          onSelectTable={handleSelectTable}
        />
      </section>

      {/* The "Active Upgrade Composition" chart and the two timeline charts that
          used to sit here now live higher up the /upgrade page (the composition
          view under Timeline View, the charts in <UpgradeChartsTabs>). */}

      {/* Authors table sits last (below the click-to-reveal EIP tables). */}
      <section ref={authorsSectionRef} id="included-authors" className="order-last">
        <div className="mb-3">
          <div className="inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-500" />
            <h3 className="text-base font-semibold tracking-tight text-foreground">Included EIP Authors</h3>
            <CopyLinkButton sectionId="included-authors" tooltipLabel="Copy link" />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">Authors whose EIPs are included across Ethereum network upgrades.</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-245 table-fixed text-sm">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[12%]" />
                <col className="w-[34%]" />
                <col className="w-[30%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Author</th>
                  <th className="px-3 py-2">EIPs</th>
                  <th className="px-3 py-2">Included EIP List</th>
                  <th className="px-3 py-2">Upgrades</th>
                </tr>
                <tr className="border-b border-border/60 bg-muted/40">
                  <th className="px-3 py-2">
                    <input
                      value={authorFilters.author}
                      onChange={(e) => {
                        setAuthorFilters((current) => ({ ...current, author: e.target.value }));
                        setAuthorPage(1);
                      }}
                      placeholder="Author name or handle"
                      className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                    />
                  </th>
                  <th className="px-3 py-2">
                    <span className="inline-flex h-8 w-full items-center rounded-md border border-border bg-muted/50 px-2 text-[11px] text-muted-foreground">
                      Count
                    </span>
                  </th>
                  <th className="px-3 py-2">
                    <input
                      value={authorFilters.eip}
                      onChange={(e) => {
                        setAuthorFilters((current) => ({ ...current, eip: e.target.value }));
                        setAuthorPage(1);
                      }}
                      placeholder="EIP-1559 / 1559"
                      className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                    />
                  </th>
                  <th className="px-3 py-2">
                    <input
                      value={authorFilters.upgrade}
                      onChange={(e) => {
                        setAuthorFilters((current) => ({ ...current, upgrade: e.target.value }));
                        setAuthorPage(1);
                      }}
                      placeholder="Upgrade"
                      className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedAuthorRows.map((row) => {
                  return (
                    <tr key={row.id} className="border-b border-border/60 text-foreground hover:bg-muted/40">
                      <td className="px-3 py-2 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-border/70">
                            {row.githubHandle ? (
                              <AvatarImage src={`https://github.com/${row.githubHandle}.png?size=64`} alt={row.displayName} />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                              {getInitials(row.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span>{row.displayName}</span>
                            {row.githubHandle && <span className="text-[11px] font-normal text-muted-foreground">@{row.githubHandle}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.totalEips}</td>
                      <td className="px-3 py-2 text-primary">
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          {row.eipNumbers.map((eipNumber) => (
                            <Link key={`${row.id}-eip-${eipNumber}`} href={`/eip/${eipNumber}`} className="hover:underline">
                              EIP-{eipNumber}
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.upgrades.join(', ') || '-'}</td>
                    </tr>
                  );
                })}
                {paginatedAuthorRows.length === 0 && (
                  <tr className="border-b border-border/60">
                    <td colSpan={4} className="px-4 py-8 text-sm text-muted-foreground">
                      No matching rows found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span>{Object.values(authorFilters).some((value) => value.trim().length > 0) ? 'Filtered results' : 'Results'}: {filteredAuthorRows.length.toLocaleString()}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAuthorFilters}
                className="rounded-md border border-border bg-muted/60 px-2 py-1 text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                Reset Filters
              </button>
              <button
                onClick={downloadAuthorReport}
                className="rounded-md border border-border bg-muted/60 px-2 py-1 text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                Download Reports
              </button>
              <button
                onClick={() => setAuthorPage((current) => Math.max(1, current - 1))}
                disabled={authorPage <= 1}
                className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <span>Page {authorPage} / {authorTotalPages}</span>
              <button
                onClick={() => setAuthorPage((current) => Math.min(authorTotalPages, current + 1))}
                disabled={authorPage >= authorTotalPages}
                className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Only rendered once a stat card is selected — no empty placeholder card. */}
      {activeTable && (
      <section ref={detailsSectionRef} id="upgrade-eip-details">
        {activeTable && (
          <div className="mb-3">
            <div className="inline-flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-indigo-500" />
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {activeTable === 'meta'
                  ? 'Hard Fork Meta EIPs'
                  : activeTable === 'execution'
                    ? 'Execution Layer EIPs'
                    : activeTable === 'consensus'
                      ? 'Consensus Layer EIPs'
                      : activeTable === 'core'
                        ? 'EIPs Deployed'
                        : 'Included EIP Authors'}
              </h3>
              <CopyLinkButton sectionId="upgrade-eip-details" tooltipLabel="Copy link" />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {activeTable === 'meta'
                ? 'Meta EIPs associated with upgrades in the distribution chart.'
                : activeTable === 'execution'
                  ? 'Core EIPs deployed through execution-layer upgrades.'
                  : activeTable === 'consensus'
                    ? 'Core EIPs deployed through consensus-layer upgrades.'
                    : activeTable === 'core'
                      ? 'Core EIPs deployed in upgrades from the distribution chart.'
                      : 'Authors whose EIPs are included across Ethereum network upgrades.'}
            </p>
            {activeTable === 'meta' && (
              <p className="mt-1 text-xs text-muted-foreground">
                Data source: Meta-EIP mappings are curated from Ethereum upgrade references and EIP metadata in the network upgrades dataset.
              </p>
            )}
          </div>
        )}
        <div className="mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm"
          >
            {!activeTable ? (
              <div className="flex flex-col gap-4 px-6 py-8 text-center">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">EIP Details</h3>
                  <p className="text-sm text-muted-foreground">Select a stats card above to view detailed EIP information from the distribution chart.</p>
                </div>
                <CopyLinkButton sectionId="upgrade-eip-details" tooltipLabel="Copy link" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                {activeTable && activeTable !== 'authors' ? (
                  <table className="w-full min-w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[14%]" />
                      <col className="w-[34%]" />
                      <col className="w-[16%]" />
                      <col className="w-[14%]" />
                      <col className="w-[22%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-border/70 bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-2 py-2">EIP</th>
                        <th className="px-2 py-2">Title</th>
                        <th className="px-2 py-2">Upgrade</th>
                        <th className="px-2 py-2">Layer</th>
                        <th className="px-2 py-2">Date</th>
                      </tr>
                      <tr className="border-b border-border/60 bg-muted/40">
                        <th className="px-2 py-2">
                          <input
                            value={columnSearch.eip}
                            onChange={(e) => handleColumnSearch('eip', e.target.value)}
                            placeholder="EIP-1559 / 1559"
                            className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                          />
                        </th>
                        <th className="px-2 py-2">
                          <input
                            value={columnSearch.title}
                            onChange={(e) => handleColumnSearch('title', e.target.value)}
                            placeholder="Title"
                            className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                          />
                        </th>
                        <th className="px-2 py-2">
                          <input
                            value={columnSearch.upgrade}
                            onChange={(e) => handleColumnSearch('upgrade', e.target.value)}
                            placeholder="Upgrade"
                            className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                          />
                        </th>
                        <th className="px-2 py-2">
                          <input
                            value={columnSearch.layer}
                            onChange={(e) => handleColumnSearch('layer', e.target.value)}
                            placeholder="Layer"
                            className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                          />
                        </th>
                        <th className="px-2 py-2">
                          <input
                            value={columnSearch.date}
                            onChange={(e) => handleColumnSearch('date', e.target.value)}
                            placeholder="YYYY-MM-DD"
                            className="h-8 w-full rounded-md border border-border bg-muted/60 px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.map((row) => (
                        <tr key={row.id} className="border-b border-border/60 text-foreground hover:bg-muted/40">
                          <td className="px-2 py-2 font-medium text-primary">
                            <Link href={`/eip/${row.eipNumber}`} className="hover:underline">
                              EIP-{row.eipNumber}
                            </Link>
                          </td>
                          <td className="px-2 py-2 text-foreground">{row.title}</td>
                          <td className="px-2 py-2 text-muted-foreground">
                            {row.upgradeHref ? (
                              <Link href={row.upgradeHref} className="text-primary hover:underline">
                                {row.upgrade}
                              </Link>
                            ) : (
                              row.upgrade
                            )}
                          </td>
                          <td className="px-2 py-2 text-muted-foreground">{row.layer}</td>
                          <td className="px-2 py-2 text-muted-foreground">{row.date}</td>
                        </tr>
                      ))}
                      {paginatedRows.length === 0 && (
                        <tr className="border-b border-border/60">
                          <td colSpan={5} className="px-4 py-8 text-sm text-muted-foreground">
                            No matching rows found for the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-4 py-10 text-sm text-muted-foreground">
                    Choose <span className="text-foreground">EIPs Deployed</span> or <span className="text-foreground">Hard Fork Meta EIPs</span> above to load the table.
                  </div>
                )}
              </div>
            )}
            {activeTable && activeTable !== 'authors' && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span>{isTableFiltered ? 'Filtered results' : 'Results'}: {resultCount.toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearFilters}
                    className="rounded-md border border-border bg-muted/60 px-2 py-1 text-muted-foreground hover:border-primary/40 hover:text-primary"
                  >
                    Reset Filters
                  </button>
                  <button
                    onClick={downloadReport}
                    className="rounded-md border border-border bg-muted/60 px-2 py-1 text-muted-foreground hover:border-primary/40 hover:text-primary"
                  >
                    Download Reports
                  </button>
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span>Page {page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                    className="rounded-md border border-border bg-muted/60 px-2 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
      )}
    </div>
  );
}

function getUpgradeHref(upgrade: string, date: string): string | null {
  const pairedUpgradeName = pairedUpgradeNames[date];
  if (pairedUpgradeName === 'Shapella') return '/upgrade/shanghai';
  if (pairedUpgradeName === 'Dencun') return '/upgrade/cancun';
  if (pairedUpgradeName === 'Pectra') return '/upgrade/pectra';
  if (pairedUpgradeName === 'Fusaka') return '/upgrade/fusaka';

  const directMap: Record<string, string> = {
    Frontier: '/upgrade/frontier',
    Homestead: '/upgrade/homestead',
    'DAO Fork': '/upgrade/dao-fork',
    'Tangerine Whistle': '/upgrade/tangerine-whistle',
    'Spurious Dragon': '/upgrade/spurious-dragon',
    Byzantium: '/upgrade/byzantium',
    Constantinople: '/upgrade/constantinople',
    Istanbul: '/upgrade/istanbul',
    Berlin: '/upgrade/berlin',
    London: '/upgrade/london',
    Paris: '/upgrade/paris',
    Shanghai: '/upgrade/shanghai',
    Cancun: '/upgrade/cancun',
    Prague: '/upgrade/pectra',
    Electra: '/upgrade/pectra',
    Osaka: '/upgrade/fusaka',
    Fulu: '/upgrade/fusaka',
  };

  if (directMap[upgrade]) return directMap[upgrade];
  if (date === '2024-03-13') return '/upgrade/cancun';
  if (date === '2025-05-07') return '/upgrade/pectra';
  if (date === '2025-12-03') return '/upgrade/fusaka';
  return null;
}

function getDisplayUpgradeName(upgrade: string, date: string): string {
  const mergeTimestamp = new Date('2022-09-15').getTime();
  const upgradeTimestamp = new Date(date).getTime();
  if (upgradeTimestamp > mergeTimestamp && pairedUpgradeNames[date]) {
    return pairedUpgradeNames[date];
  }
  return upgrade;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}
