'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  Menu,
  X,
  PhoneCall,
  CheckSquare,
  Server,
  Activity,
  Calendar,
  History,
  LogOut,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { client } from '@/lib/orpc';
import { useSession } from '@/hooks/useSession';
import { GlobalPageFeedback } from '@/components/global-page-feedback';
import { getInProgressUpgrades, getLiveUpgrades } from '@/data/upgrade-registry';
import { UpgradeStatusBadge } from '@/components/upgrade/stage-badge';
import { ThemedLogoGif } from '@/components/themed-logo-gif';
import { ThemeToggle } from '@/components/theme-toggle';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProfileAvatar } from '@/components/profile-avatar';

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
 * Premium glassmorphic chrome for the /upgrade hub: unified brand header,
 * organized navigation dropdowns (Roadmaps, Coordination, Metrics & Timelines),
 * integrated theme toggle, user profile settings, and background status syncing.
 */
export function UpgradeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastChange, setLastChange] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const userName = session?.user?.name ?? session?.user?.email;

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
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
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

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success('Signed out');
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Sign out failed:', error);
      toast.error('Failed to sign out');
    }
  };

  const closeMenus = () => setMobileOpen(false);
  const isActive = (href: string) =>
    href === '/upgrade' ? pathname === '/upgrade' : pathname.startsWith(href);
  const onUpgradePage = upgradeLinks.some((link) => pathname.startsWith(link.href));

  const trackLinks = [
    { href: '/upgrade/calls', label: 'All-Hands Calls', icon: PhoneCall },
    { href: '/upgrade/decisions', label: 'Consensus Decisions', icon: CheckSquare },
    { href: '/upgrade/devnets', label: 'Testnets & Devnets', icon: Server },
  ];
  const exploreLinks = [
    { href: '/upgrade/analytics', label: 'Readiness Analytics', icon: Activity },
    { href: '/upgrade/schedule', label: 'Upgrade Timeline', icon: Calendar },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-300 border-b',
          'border-border/50 bg-background/80 backdrop-blur-xl',
          scrolled
            ? 'border-primary/30 bg-background/95 shadow-[0_8px_28px_rgb(var(--persona-accent-rgb)/0.12)]'
            : 'shadow-[0_2px_12px_rgb(var(--persona-accent-rgb)/0.06)]'
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          {/* Desktop Logo & Branding */}
          <div className="hidden lg:flex items-center gap-2.5">
            <Link
              href="/"
              className="flex items-center gap-2 shrink-0 group"
              title="Back to EIPsInsight"
            >
              <div className="relative">
                <ThemedLogoGif alt="EIPsInsight" width={28} height={28} unoptimized />
              </div>
              <span className="dec-title font-semibold text-foreground transition-colors group-hover:text-primary">
                EIPsInsight
              </span>
            </Link>
            <span className="h-4 w-px shrink-0 bg-border/60" />
            <Link
              href="/upgrade"
              className="dec-title shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Upgrade Hub
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="ml-4 hidden items-center gap-1.5 lg:flex">
            <NavPill href="/upgrade" label="Overview" active={pathname === '/upgrade'} />

            {/* Roadmaps Dropdown */}
            <div className="group relative">
              <button
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-200',
                  onUpgradePage || isActive('/upgrade/archive')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                Roadmaps
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
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150',
                      isActive('/upgrade/archive')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    <History className="h-4 w-4 shrink-0 text-primary/70" />
                    <span className="font-medium">Past Upgrades</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Coordination Dropdown */}
            <div className="group relative">
              <button
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-200',
                  trackLinks.some((link) => isActive(link.href))
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                Coordination
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="invisible absolute left-0 top-full z-50 pt-1.5 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="w-60 rounded-xl border border-border bg-background/95 p-1.5 shadow-xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200">
                  {trackLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150',
                        isActive(link.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <link.icon className="h-4 w-4 shrink-0 text-primary/70" />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Readiness Dropdown */}
            <div className="group relative">
              <button
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-200',
                  exploreLinks.some((link) => isActive(link.href))
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                Readiness & Timeline
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
              </button>
              <div className="invisible absolute left-0 top-full z-50 pt-1.5 opacity-0 transition-all duration-200 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="w-60 rounded-xl border border-border bg-background/95 p-1.5 shadow-xl shadow-black/20 backdrop-blur-xl animate-in fade-in slide-in-from-top-1 duration-200">
                  {exploreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150',
                        isActive(link.href)
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <link.icon className="h-4 w-4 shrink-0 text-primary/70" />
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Desktop Right Side Accessories */}
          <div className="ml-auto hidden lg:flex items-center gap-3">
            {/* Last composition sync freshness indicator */}
            {lastChange && (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                title="Latest hard fork event sync"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Synced {timeAgo(lastChange)}
              </span>
            )}

            <ThemeToggle variant="switch" className="shrink-0" />

            {/* Profile Dropdown */}
            {!session?.user ? (
              <Button
                size="sm"
                className="h-8 rounded-lg persona-gradient px-3 text-xs text-primary-foreground hover:opacity-90"
                asChild
              >
                <Link href="/login">Sign in</Link>
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card p-0 transition-all duration-200 hover:border-primary/50 hover:bg-muted/60">
                    <ProfileAvatar user={session.user} size="xs" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 overflow-hidden rounded-xl border border-border bg-popover/95 p-0 shadow-xl backdrop-blur-xl"
                >
                  <div className="relative border-b border-border bg-muted/40 px-4 py-3">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                    <div className="flex items-center gap-3">
                      <ProfileAvatar user={session.user} size="md" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm font-medium text-foreground">
                          {userName}
                        </span>
                        <span className="text-xs text-muted-foreground">Signed in</span>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-foreground">
                        <Settings2 className="h-4 w-4 text-primary" />
                        <span className="text-sm">Account</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="mx-2 my-1 border-border" />
                    <DropdownMenuItem
                      className="flex items-center gap-2 px-4 py-2 text-foreground"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4 text-rose-500 dark:text-rose-300" />
                      <span className="text-sm">Sign out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* MOBILE: Brand + Mobile Actions Bar */}
          <div className="flex lg:hidden items-center justify-between w-full">
            <Link href="/" className="flex items-center gap-2">
              <ThemedLogoGif alt="EIPsInsight" width={24} height={24} unoptimized />
              <span className="dec-title text-sm font-semibold text-foreground">
                EIPsInsight
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle variant="icon" />
              {session?.user ? (
                <Link href="/profile">
                  <ProfileAvatar user={session.user} size="xs" />
                </Link>
              ) : (
                <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              )}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className={cn(
                  'inline-flex items-center justify-center rounded-lg p-2 transition-colors',
                  'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  mobileOpen && 'bg-muted/70 text-foreground'
                )}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Expanded Drawer */}
        {mobileOpen && (
          <div className="border-t border-border/60 bg-background/95 px-4 pb-4 pt-2 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 lg:hidden">
            <div className="flex flex-col gap-1">
              <NavPill
                href="/upgrade"
                label="Overview"
                active={pathname === '/upgrade'}
                onClick={closeMenus}
              />
              <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Upgrade Roadmaps
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
              <NavPill
                href="/upgrade/archive"
                label="Past Upgrades"
                active={pathname === '/upgrade/archive'}
                onClick={closeMenus}
                className="pl-5 text-xs text-muted-foreground"
              />

              <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Coordination
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
                Readiness & Timeline
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

      {/* Main Content Layout */}
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

