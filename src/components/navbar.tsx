"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Menu,
  X,
  Settings2,
  LogOut,
  Home,
  Layers,
  Package,
  LineChart,
  BookOpen,
  Compass,
  Lightbulb,
  Wrench,
  ChevronDown,
  Crown,
  Info,
  Flame,
  Video,
  CalendarClock,
  Boxes,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/hooks/useSession";
import { ProfileAvatar } from "@/components/profile-avatar";
import { SearchBar } from "@/components/search-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemedLogoGif } from "@/components/themed-logo-gif";
import { toast } from "sonner";

const mobileNavSections = [
  {
    label: "Main",
    items: [
      { title: "Home", href: "/", icon: Home },
      { title: "Search", href: "/search", icon: Search },
    ],
  },
  {
    label: "Standards",
    items: [
      { title: "All Standards", href: "/standards", icon: Layers },
      { title: "Weekly Recap", href: "/recap", icon: Flame },
      { title: "EIPs", href: "/standards?repo=eips", icon: Layers },
      { title: "ERCs", href: "/standards?repo=ercs", icon: Layers },
      { title: "RIPs", href: "/standards?repo=rips", icon: Layers },
    ],
  },
  {
    label: "Explore",
    items: [
      { title: "Explore Hub", href: "/explore", icon: Compass },
      { title: "By Year", href: "/explore/years", icon: Compass },
      { title: "By Status", href: "/explore/status", icon: Compass },
      { title: "By Role", href: "/explore/roles", icon: Compass },
      { title: "Trending", href: "/explore/trending", icon: Compass },
    ],
  },
  {
    label: "Upgrades",
    items: [
      { title: "Overview", href: "/upgrade", icon: Package },
      { title: "Upgrade EIP Directory", href: "/upgrade/eips", icon: Package },
      { title: "Hegotá", href: "/upgrade/hegota", icon: Package },
      { title: "Glamsterdam", href: "/upgrade/glamsterdam", icon: Package },
      { title: "Fusaka", href: "/upgrade/fusaka", icon: Package },
      { title: "Previous Upgrades", href: "/upgrade/archive", icon: Package },
      { title: "Devnets", href: "/upgrade/devnets", icon: Package },
      { title: "Schedule", href: "/upgrade/schedule", icon: Package },
    ],
  },
  {
    label: "Protocol Calls",
    items: [
      { title: "All Calls", href: "/calls", icon: Video },
      { title: "ACD Calls", href: "/calls?series=acd#recent", icon: Video },
      { title: "Breakout Calls", href: "/calls?series=breakouts#recent", icon: Video },
      { title: "EthProof Calls", href: "/calls?series=ethproofs#recent", icon: Video },
      { title: "Decisions", href: "/decisions", icon: Video },
    ],
  },
  {
    label: "EIP Office Hours",
    items: [
      { title: "Overview", href: "/officehours", icon: CalendarClock },
      { title: "Board", href: "/officehours/board", icon: CalendarClock },
      { title: "PR Analytics", href: "/officehours/prs", icon: CalendarClock },
      { title: "Calls", href: "/officehours/calls", icon: CalendarClock },
    ],
  },
  {
    label: "EIPIP Meetings",
    items: [
      { title: "Overview", href: "/eipip", icon: CalendarClock },
      { title: "Meetings", href: "/eipip/calls", icon: CalendarClock },
    ],
  },
  {
    label: "Analytics & Insights",
    items: [
      { title: "Analytics Home", href: "/analytics", icon: LineChart },
      { title: "EIPs", href: "/analytics/eips", icon: LineChart },
      { title: "PRs", href: "/analytics/prs", icon: LineChart },
      { title: "Editors Leaderboard", href: "/analytics/editors", icon: LineChart },
      { title: "Reviewers", href: "/analytics/reviewers", icon: LineChart },
      { title: "Authors", href: "/analytics/authors", icon: LineChart },
      { title: "Contributors", href: "/analytics/contributors", icon: LineChart },
      { title: "Monthly", href: "/insights", icon: Lightbulb },
      { title: "Editorial", href: "/insights/commentary", icon: Lightbulb },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "Tools Home", href: "/tools", icon: Wrench },
      { title: "EIP Builder", href: "/eip-builder", icon: Wrench },
      { title: "Timeline", href: "/timeline", icon: Wrench },
      { title: "Dependencies", href: "/dependencies", icon: Wrench },
      { title: "Account Abstraction", href: "/aa", icon: Boxes },
    ],
  },
  {
    label: "Research",
    items: [
      { title: "All Research", href: "/research", icon: FlaskConical },
      { title: "What Glamsterdam Breaks", href: "/research/glamsterdam", icon: FlaskConical },
    ],
  },
  {
    label: "Resources",
    items: [
      { title: "Docs", href: "/resources/docs", icon: BookOpen },
      { title: "Blogs", href: "/resources/blogs", icon: BookOpen },
      { title: "Videos", href: "/resources/videos", icon: BookOpen },
      { title: "News", href: "/resources/news", icon: BookOpen },
      { title: "FAQ", href: "/resources/faq", icon: BookOpen },
      { title: "Milestones", href: "/resources/milestones", icon: BookOpen },
      { title: "About Us", href: "/about", icon: Info },
    ],
  },
];

const mobileQuickItems = [
  { title: "Home", href: "/", icon: Home },
  { title: "Search", href: "/search", icon: Search },
  { title: "Standards", href: "/standards", icon: Layers },
  { title: "Upgrades", href: "/upgrade", icon: Package },
  { title: "Analytics", href: "/analytics", icon: LineChart },
  { title: "Resources", href: "/resources", icon: BookOpen },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileOpenSection, setMobileOpenSection] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [membershipTier, setMembershipTier] = useState<string>("free");
  const { data: session } = useSession();

  const userName = session?.user?.name ?? session?.user?.email;

  // Fetch membership tier
  useEffect(() => {
    if (session?.user) {
      fetch("/api/stripe/subscription")
        .then((res) => res.json())
        .then((data) => setMembershipTier(data?.tier || "free"))
        .catch(() => setMembershipTier("free"));
    }
  }, [session?.user]);

  // Handle scroll for sticky navbar effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Signed out");
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("Failed to sign out");
    }
  };

  return (
    <nav
      data-tour="navbar"
      className={cn(
        "relative z-50 w-full transition-all duration-300",
        "border-b border-border bg-background/95 backdrop-blur-xl",
        scrolled
          ? "border-primary/30 bg-background/98 shadow-[0_8px_28px_rgb(var(--persona-accent-rgb)/0.14)]"
          : "shadow-[0_2px_12px_rgb(var(--persona-accent-rgb)/0.08)]"
      )}
    >
      <div className="w-full max-w-full px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex h-14 items-center gap-3">
          {/* LEFT: Logo (Desktop) */}
          <Link
            href="/"
            className="hidden md:flex items-center gap-2 shrink-0 basis-[220px] min-w-[220px] group"
          >
            <div className="relative">
              <ThemedLogoGif
                alt="EIPsInsight"
                width={28}
                height={28}
                unoptimized
              />
            </div>
            <span className="dec-title font-semibold text-foreground transition-colors group-hover:text-primary">
              EIPsInsight
            </span>
          </Link>

          {/* CENTER: full search bar when there's room (lg+); a clear search
              icon-link on medium widths where the sidebar squeezes the header so
              the field doesn't collapse into an ambiguous, "unresponsive" sliver. */}
          <div className="hidden md:flex min-w-0 flex-1 justify-center px-2 lg:px-4">
            <div className="hidden w-full max-w-xl xl:block">
              <SearchBar />
            </div>
            <Link
              href="/search"
              aria-label="Search EIPs, ERCs, RIPs"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground xl:hidden"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Link>
          </div>

          {/* RIGHT: Theme + Profile (Desktop) */}
          <div className="hidden md:flex items-center justify-end gap-2 shrink-0">
            <ThemeToggle variant="switch" className="shrink-0" />

            {/* Profile / Auth */}
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
                  <button className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card p-0 transition-all duration-200 hover:border-primary/50 hover:bg-muted/60">
                    <ProfileAvatar user={session.user} size="xs" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 overflow-hidden rounded-xl border border-border bg-popover/95 p-0 shadow-xl backdrop-blur-xl"
                >
                  {/* Header */}
                  <div className="relative border-b border-border bg-muted/40 px-4 py-3">
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />
                    <div className="flex items-center gap-3">
                      <ProfileAvatar user={session.user} size="md" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm font-medium text-foreground">
                          {userName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Signed in
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
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

          {/* MOBILE: Logo + Menu Toggle */}
          <div className="flex md:hidden items-center justify-between w-full">
            {/* Mobile Logo */}
            <Link href="/" className="flex items-center gap-2">
              <ThemedLogoGif
                alt="EIPsInsight"
                width={24}
                height={24}
                unoptimized
              />
              <span className="dec-title text-sm font-semibold text-foreground">
                EIPsInsight
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <ThemeToggle variant="icon" />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={cn(
                "inline-flex items-center justify-center rounded-lg p-2 transition-colors",
                "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                mobileOpen && "bg-muted/70 text-foreground"
              )}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE PANEL */}
      {mobileOpen && (
        <div className="border-t border-border bg-background/98 backdrop-blur-xl md:hidden">
          <div className="space-y-3 px-4 py-4">
            {/* Mobile Search — links to the full search page (the bare input here
                had no handlers, so it did nothing when tapped). */}
            <Link
              href="/search"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex h-9 w-full items-center rounded-md border border-border bg-muted/60 px-10 text-sm text-muted-foreground",
                "transition-colors hover:border-primary/40 hover:text-foreground"
              )}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              Search EIPs, ERCs, RIPs, authors…
            </Link>

            {/* Mobile Navigation (compact + expandable) */}
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Access
                </p>
                <nav className="flex flex-wrap gap-2">
                  {mobileQuickItems.map((item) => {
                    const itemPath = item.href.split("?")[0];
                    const isActive =
                      pathname === itemPath ||
                      (itemPath !== "/" && pathname.startsWith(itemPath));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition-all",
                          isActive
                            ? "border-primary/50 bg-primary/10 text-foreground font-medium"
                            : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:bg-muted/70 hover:text-foreground"
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-primary/80")} />
                        {item.title}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-2">
                {mobileNavSections.map((section) => {
                  const sectionKey = section.label;
                  const isSectionOpen = mobileOpenSection === sectionKey;
                  const sectionHasActive = section.items.some((item) => {
                    const itemPath = item.href.split("?")[0];
                    return pathname === itemPath || (itemPath !== "/" && pathname.startsWith(itemPath));
                  });

                  return (
                    <div key={section.label} className="overflow-hidden rounded-lg border border-border bg-muted/30">
                      <button
                        type="button"
                        onClick={() => setMobileOpenSection((prev) => (prev === sectionKey ? null : sectionKey))}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider transition-colors",
                          sectionHasActive ? "text-foreground bg-primary/8" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        )}
                      >
                        {section.label}
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isSectionOpen && "rotate-180")} />
                      </button>
                      {isSectionOpen && (
                        <nav className="space-y-1 border-t border-border/70 px-2 py-2">
                          {section.items.map((item) => {
                            const itemPath = item.href.split("?")[0];
                            const isActive =
                              pathname === itemPath ||
                              (itemPath !== "/" && pathname.startsWith(itemPath));
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-all",
                                  isActive
                                    ? "bg-primary/10 text-foreground"
                                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                )}
                              >
                                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-primary/80")} />
                                <span className="truncate">{item.title}</span>
                              </Link>
                            );
                          })}
                        </nav>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Upgrade Button */}
            {session?.user && membershipTier === "free" && (
              <Link
                href="/pricing"
                className="w-full flex items-center justify-center gap-2 rounded-lg persona-gradient text-white text-sm font-semibold py-2.5 px-3 transition hover:opacity-90 hover:shadow-lg"
              >
                <Crown className="h-4 w-4" />
                Premium Early Access
              </Link>
            )}

            {/* Mobile Auth Row */}
            <div className="flex items-center justify-end gap-2 border-t border-border pt-2">

              {/* Auth */}
              {!session?.user ? (
                <Button
                  size="sm"
                  className="h-8 rounded-lg persona-gradient px-3 text-xs text-primary-foreground hover:opacity-90"
                  asChild
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ProfileAvatar user={session.user} size="sm" />
                    <span className="truncate max-w-[80px]">{session.user.name || "Account"}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-400 hover:text-rose-300 h-8 px-2 text-xs"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
