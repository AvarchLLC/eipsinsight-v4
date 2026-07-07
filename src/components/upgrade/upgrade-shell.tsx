'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import { useSession } from '@/hooks/useSession';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GlobalPageFeedback } from '@/components/global-page-feedback';
import { getInProgressUpgrades, getLiveUpgrades } from '@/data/upgrade-registry';
import { UpgradeStatusBadge } from '@/components/upgrade/stage-badge';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NavPill({
  href,
  label,
  active,
  onClick,
  className,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'relative rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        className
      )}
    >
      {label}
    </Link>
  );
}

/**
 * Minimal chrome for the /upgrade dashboard: slim sticky navbar (brand,
 * Overview / Upgrades ▾ / Calls / Decisions / Schedule / Devnets · Analytics /
 * Archive, freshness indicator, avatar when signed in) and a one-line footer.
 */
export function UpgradeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastChange, setLastChange] = useState<string | null>(null);

  const upgradeLinks = useMemo(() => {
    const inProgress = getInProgressUpgrades();
    const live = getLiveUpgrades().slice(0, 3);
    return [...inProgress, ...live].map((entry) => ({
      href: `/upgrade/${entry.slug}`,
      label: entry.name,
      status: entry.status,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    client.upgrades
      .getRecentCompositionActivity({ limit: 1 })
      .then((events) => {
        if (!cancelled && events[0]?.commit_date) setLastChange(events[0].commit_date);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const closeMenus = () => setMobileOpen(false);
  const isActive = (href: string) =>
    href === '/upgrade' ? pathname === '/upgrade' : pathname.startsWith(href);
  const onUpgradePage = upgradeLinks.some((link) => pathname.startsWith(link.href));

  const trackLinks = [
    { href: '/upgrade/calls', label: 'Calls' },
    { href: '/upgrade/decisions', label: 'Decisions' },
    { href: '/upgrade/schedule', label: 'Schedule' },
    { href: '/upgrade/devnets', label: 'Devnets' },
  ];
  const exploreLinks = [
    { href: '/upgrade/analytics', label: 'Analytics' },
    { href: '/upgrade/archive', label: 'Archive' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2.5 px-4 sm:px-6">
          {/* Brand */}
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2"
            title="Back to EIPsInsight"
          >
            <span className="persona-gradient flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-black transition-transform duration-200 group-hover:scale-105">
              Ei
            </span>
            <span className="hidden text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground min-[420px]:inline">
              EIPs<span className="text-primary">Insight</span>
            </span>
          </Link>
          <span className="h-4 w-px shrink-0 bg-border" />
          <Link
            href="/upgrade"
            className="dec-title shrink-0 text-base font-semibold tracking-tight text-foreground"
          >
            Upgrades
          </Link>

          {/* Desktop nav */}
          <nav className="ml-3 hidden items-center gap-0.5 lg:flex">
            <NavPill href="/upgrade" label="Overview" active={pathname === '/upgrade'} />

            {/* Upgrades dropdown (hover/focus) */}
            <div className="group relative">
              <button
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-200',
                  onUpgradePage
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                Upgrades
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="invisible absolute left-0 top-full z-50 pt-1.5 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="w-60 rounded-xl border border-border bg-background/95 p-1.5 shadow-xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200">
                  {upgradeLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150',
                        isActive(link.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <span className="font-medium">{link.label}</span>
                      <UpgradeStatusBadge status={link.status} className="text-[9px]" />
                    </Link>
                  ))}
                  <div className="my-1 h-px bg-border/60" />
                  <Link
                    href="/upgrade/archive"
                    className="block rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    All past upgrades →
                  </Link>
                </div>
              </div>
            </div>

            {trackLinks.map((link) => (
              <NavPill
                key={link.href}
                href={link.href}
                label={link.label}
                active={isActive(link.href)}
              />
            ))}

            <span className="mx-1.5 h-4 w-px bg-border/70" />

            {exploreLinks.map((link) => (
              <NavPill
                key={link.href}
                href={link.href}
                label={link.label}
                active={isActive(link.href)}
              />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* Freshness */}
            {lastChange && (
              <span
                className="hidden items-center gap-1.5 text-[11px] text-muted-foreground xl:inline-flex"
                title="Most recent composition change parsed from meta-EIP commits"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                updated {timeAgo(lastChange)}
              </span>
            )}

            {/* Avatar only when signed in */}
            {session?.user && (
              <Link href="/profile" title={session.user.name ?? 'Profile'}>
                <Avatar className="h-7 w-7 border border-border/70 transition-transform duration-200 hover:scale-105">
                  {session.user.image && (
                    <AvatarImage src={session.user.image} alt={session.user.name ?? ''} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                    {(session.user.name ?? session.user.email ?? '?').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((current) => !current)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground lg:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Accent hairline */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {/* Mobile expanded menu */}
        {mobileOpen && (
          <div className="border-b border-border/60 bg-background/95 px-4 pb-3 pt-1 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 lg:hidden">
            <div className="flex flex-col gap-0.5">
              <NavPill
                href="/upgrade"
                label="Overview"
                active={pathname === '/upgrade'}
                onClick={closeMenus}
              />
              <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Upgrades
              </p>
              {upgradeLinks.map((link) => (
                <NavPill
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={isActive(link.href)}
                  onClick={closeMenus}
                  className="pl-5"
                />
              ))}
              <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Follow along
              </p>
              {trackLinks.map((link) => (
                <NavPill
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={isActive(link.href)}
                  onClick={closeMenus}
                  className="pl-5"
                />
              ))}
              <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Dig deeper
              </p>
              {exploreLinks.map((link) => (
                <NavPill
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={isActive(link.href)}
                  onClick={closeMenus}
                  className="pl-5"
                />
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Content fades in when arriving from the main app */}
      <main className="flex-1 animate-in fade-in slide-in-from-bottom-1 duration-300">
        {children}
        <section className="mx-auto w-full max-w-6xl px-4 pb-6 sm:px-6">
          <GlobalPageFeedback />
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground sm:px-6">
          <span>
            Powered by{' '}
            <Link href="/" className="text-foreground/80 hover:text-primary">
              EIPsInsight
            </Link>{' '}
            · tracking data refreshes every 5 minutes
          </span>
          <a
            href="https://github.com/AvarchLLC/EIPsInsight"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
