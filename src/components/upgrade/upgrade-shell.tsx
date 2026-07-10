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
  Twitter,
  Github,
  Youtube,
  Linkedin,
  Globe,
  Heart,
  Bug,
  MessageSquare,
  Key,
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
    { href: '/upgrade/calls', label: 'AllCoreDevs Calls', icon: PhoneCall },
    { href: '/upgrade/decisions', label: 'Consensus Decisions', icon: CheckSquare },
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
            <NavPill href="/upgrade/eips" label="EIPs" active={pathname === '/upgrade/eips'} />

            {/* Upgrades Dropdown */}
            <div className="group relative">
              <button
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-200',
                  onUpgradePage || isActive('/upgrade/archive')
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

            <NavPill href="/upgrade/devnets" label="Devnets" active={pathname.startsWith('/upgrade/devnets')} />

            {/* Meetings Dropdown */}
            <div className="group relative">
              <button
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-200',
                  trackLinks.some((link) => isActive(link.href))
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                Meetings & Decisions
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
                Readiness & Timelines
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
              <NavPill
                href="/upgrade/eips"
                label="EIPs"
                active={pathname === '/upgrade/eips'}
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
              <NavPill
                href="/upgrade/archive"
                label="Past Upgrades"
                active={pathname === '/upgrade/archive'}
                onClick={closeMenus}
                className="pl-5 text-xs text-muted-foreground"
              />

              <NavPill
                href="/upgrade/devnets"
                label="Devnets"
                active={pathname === '/upgrade/devnets'}
                onClick={closeMenus}
              />

              <p className="px-2.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Meetings & Decisions
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
                Readiness & Timelines
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
      </main>
      <GlobalPageFeedback />

      <footer className="relative border-t border-border/60 bg-muted/10">
        {/* Subtle top accent gradient */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12">
            {/* Column 1: Brand & Description */}
            <div className="sm:col-span-2 lg:col-span-4 space-y-4">
              <Link href="/" className="group inline-flex items-center gap-2.5">
                <ThemedLogoGif
                  alt="EIPsInsight"
                  width={32}
                  height={32}
                  unoptimized
                  className="transition-transform duration-300 group-hover:scale-105"
                />
                <span className="dec-title text-lg font-semibold tracking-tight text-foreground">
                  EIPsInsight
                </span>
              </Link>
              <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                Ethereum hard fork coordination, testnet metrics, and standards tracking hub. Observability for protocol upgrades.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Built with</span>
                <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                <span>by Avarch</span>
              </div>
            </div>

            {/* Column 2: Upgrade Roadmaps */}
            <div className="lg:col-span-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Upgrade Roadmaps
              </h3>
              <ul className="mt-3 space-y-2 text-xs">
                {upgradeLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/upgrade/archive" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                    <History className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span>Past Upgrades</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Coordination & Metrics */}
            <div className="lg:col-span-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Coordination
              </h3>
              <ul className="mt-3 space-y-2 text-xs">
                {trackLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5">
                      <link.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
                {exploreLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5">
                      <link.icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Support Portal */}
            <div className="lg:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Support
              </h3>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <a
                    href="https://github.com/AvarchLLC/eipsinsight-v4/issues/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                  >
                    <Bug className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span>Report a bug</span>
                  </a>
                </li>
                <li>
                  <Link href="/feedback" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span>Feedback</span>
                  </Link>
                </li>
                <li>
                  <Link href="/api-tokens" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span>API Data</span>
                  </Link>
                </li>
                <li>
                  <Link href="/donate" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span>Donate</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Socials */}
          <div className="mt-10 pt-6 border-t border-border/40 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-[11px] text-muted-foreground">
            <div>
              <span>© 2026 EIPsInsight. tracking data refreshes every 5 minutes.</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://x.com/EIPsInsight"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
                title="X (Twitter)"
              >
                <Twitter className="h-4 w-4 text-sky-400 hover:scale-110 transition-transform duration-150" />
              </a>
              <a
                href="https://github.com/AvarchLLC/eipsinsight-v4"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
                title="GitHub"
              >
                <Github className="h-4 w-4 text-foreground/80 dark:text-foreground/60 hover:scale-110 transition-transform duration-150" />
              </a>
              <a
                href="https://www.youtube.com/@etherworldco"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
                title="YouTube"
              >
                <Youtube className="h-4 w-4 text-red-500 hover:scale-110 transition-transform duration-150" />
              </a>
              <a
                href="https://www.linkedin.com/company/eipsinsight/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
                title="LinkedIn"
              >
                <Linkedin className="h-4 w-4 text-blue-500 hover:scale-110 transition-transform duration-150" />
              </a>
              <a
                href="https://etherworld.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
                title="EtherWorld Website"
              >
                <Globe className="h-4 w-4 text-emerald-500 hover:scale-110 transition-transform duration-150" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

